"use client";

import { useState, useCallback, useRef } from "react";
import { FilecoinStorageClient } from "@commonwealth/sdk";

export function useFilecoin() {
  const clientRef = useRef<FilecoinStorageClient | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastCID, setLastCID] = useState<string | null>(null);

  function getClient(): FilecoinStorageClient {
    if (!clientRef.current) {
      clientRef.current = new FilecoinStorageClient();
    }
    return clientRef.current;
  }

  const uploadJSON = useCallback(async (data: Record<string, unknown>): Promise<string> => {
    setIsUploading(true);
    try {
      const client = getClient();
      const cid = await client.uploadJSON(data);
      setLastCID(cid);
      return cid;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const client = getClient();
      const cid = await client.uploadFile(file);
      setLastCID(cid);
      return cid;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadJSON, uploadFile, isUploading, lastCID };
}
