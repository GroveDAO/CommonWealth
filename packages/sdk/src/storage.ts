export class FilecoinStorageClient {
  private client: unknown = null;

  async initialize(email: string): Promise<void> {
    const { create } = await import("@web3-storage/w3up-client");
    this.client = await create();
    const c = this.client as {
      login: (email: string) => Promise<unknown>;
    };
    await c.login(email as `${string}@${string}`);
  }

  async uploadJSON(data: Record<string, unknown>): Promise<string> {
    if (!this.client) throw new Error("Client not initialized. Call initialize() first.");
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const file = new File([blob], "data.json");
    const c = this.client as {
      uploadFile: (file: File) => Promise<{ toString: () => string }>;
    };
    const cid = await c.uploadFile(file);
    return cid.toString();
  }

  async uploadFile(file: File): Promise<string> {
    if (!this.client) throw new Error("Client not initialized. Call initialize() first.");
    const c = this.client as {
      uploadFile: (file: File) => Promise<{ toString: () => string }>;
    };
    const cid = await c.uploadFile(file);
    return cid.toString();
  }

  getGatewayURL(cid: string): string {
    return `https://${cid}.ipfs.w3s.link`;
  }
}
