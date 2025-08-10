export const queryKeys = {
  collections: ["collections"] as const,
  collectionDocs: (name: string) => ["collectionDocs", name] as const,
};
