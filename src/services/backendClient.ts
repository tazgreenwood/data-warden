import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { JSONRPCRequest, JSONRPCResponse } from '../types';

export class BackendClient {
    private process: ChildProcess | null = null;
    private pendingRequests: Map<string, {
        resolve: (result: any) => void;
        reject: (error: Error) => void;
    }> = new Map();
    private requestIdCounter = 0;
    private outputChannel: vscode.OutputChannel;
    private buffer = '';

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Data Warden Backend');
    }

    async start(): Promise<void> {
        if (this.process) {
            return; // Already started
        }

        const backendPath = this.getBackendPath();
        this.outputChannel.appendLine(`Starting backend: ${backendPath}`);

        // Check if backend exists
        if (!fs.existsSync(backendPath)) {
            throw new Error(`Backend binary not found at: ${backendPath}. Run 'npm run build' to build it.`);
        }

        try {
            this.process = spawn(backendPath, [], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Handle spawn errors
            this.process.on('error', (err) => {
                this.outputChannel.appendLine(`Failed to spawn backend process: ${err.message}`);
                throw err;
            });

            // Handle stdout (JSON-RPC responses)
            this.process.stdout?.on('data', (data: Buffer) => {
                this.handleStdout(data);
            });

            // Handle stderr (logs)
            this.process.stderr?.on('data', (data: Buffer) => {
                this.outputChannel.appendLine(`[Backend] ${data.toString()}`);
            });

            // Handle process exit
            this.process.on('exit', (code) => {
                this.outputChannel.appendLine(`Backend exited with code ${code}`);
                this.process = null;

                // Reject all pending requests
                for (const [id, pending] of this.pendingRequests) {
                    pending.reject(new Error('Backend process exited'));
                }
                this.pendingRequests.clear();
            });

            // Wait a bit for process to start
            await new Promise(resolve => setTimeout(resolve, 100));

            // Test the connection with a ping
            try {
                await Promise.race([
                    this.sendRequest('ping', {}),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Backend ping timeout')), 5000)
                    )
                ]);
                this.outputChannel.appendLine('Backend started successfully');
            } catch (pingError) {
                this.outputChannel.appendLine(`Backend ping failed: ${pingError}`);
                if (this.process) {
                    this.process.kill();
                    this.process = null;
                }
                throw new Error(`Backend failed to respond: ${pingError}`);
            }

        } catch (error) {
            this.outputChannel.appendLine(`Failed to start backend: ${error}`);
            if (this.process) {
                this.process.kill();
                this.process = null;
            }
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (this.process) {
            this.outputChannel.appendLine('Stopping backend...');
            this.process.kill();
            this.process = null;
        }
    }

    async sendRequest(method: string, params?: any): Promise<any> {
        if (!this.process) {
            throw new Error('Backend not started');
        }

        const id = (++this.requestIdCounter).toString();
        const request: JSONRPCRequest = {
            jsonrpc: '2.0',
            id,
            method,
            params
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });

            const requestStr = JSON.stringify(request) + '\n';
            this.process!.stdin?.write(requestStr, (err) => {
                if (err) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Failed to send request: ${err.message}`));
                }
            });
        });
    }

    async sendCancellableRequest(method: string, params?: any): Promise<{ requestId: string; promise: Promise<any> }> {
        if (!this.process) {
            throw new Error('Backend not started');
        }

        const id = (++this.requestIdCounter).toString();
        const request: JSONRPCRequest = {
            jsonrpc: '2.0',
            id,
            method,
            params
        };

        const promise = new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });

            const requestStr = JSON.stringify(request) + '\n';
            this.process!.stdin?.write(requestStr, (err) => {
                if (err) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Failed to send request: ${err.message}`));
                }
            });
        });

        return { requestId: id, promise };
    }

    async cancelQuery(requestId: string): Promise<void> {
        if (!this.process) {
            throw new Error('Backend not started');
        }

        // Send cancel request immediately without waiting for response
        const cancelRequestId = (++this.requestIdCounter).toString();
        const request: JSONRPCRequest = {
            jsonrpc: '2.0',
            id: cancelRequestId,
            method: 'cancelQuery',
            params: { requestId }
        };

        const requestStr = JSON.stringify(request) + '\n';
        this.outputChannel.appendLine(`[Cancel] Sending cancel request for query ${requestId}`);

        // Write immediately and don't wait for response
        this.process.stdin?.write(requestStr, (err) => {
            if (err) {
                this.outputChannel.appendLine(`[Cancel] Failed to send: ${err.message}`);
            } else {
                this.outputChannel.appendLine(`[Cancel] Cancel request sent successfully`);
            }
        });

        // Don't wait for the response - return immediately
        return Promise.resolve();
    }

    private handleStdout(data: Buffer): void {
        this.buffer += data.toString();

        // Process complete lines
        let newlineIndex: number;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.slice(0, newlineIndex);
            this.buffer = this.buffer.slice(newlineIndex + 1);

            if (line.trim()) {
                this.handleResponse(line);
            }
        }
    }

    private handleResponse(line: string): void {
        try {
            const response: JSONRPCResponse = JSON.parse(line);

            const pending = this.pendingRequests.get(response.id);
            if (!pending) {
                this.outputChannel.appendLine(`Received response for unknown request: ${response.id}`);
                return;
            }

            this.pendingRequests.delete(response.id);

            if (response.error) {
                pending.reject(new Error(response.error.message));
            } else {
                pending.resolve(response.result);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Failed to parse response: ${error}`);
        }
    }

    private getBackendPath(): string {
        // In development, the backend binary should be at dist/backend
        // In production (packaged extension), it should be in the extension root
        const isDev = this.context.extensionMode === vscode.ExtensionMode.Development;

        if (process.platform === 'win32') {
            return path.join(this.context.extensionPath, 'dist', 'backend.exe');
        } else {
            return path.join(this.context.extensionPath, 'dist', 'backend');
        }
    }

    getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }
}
