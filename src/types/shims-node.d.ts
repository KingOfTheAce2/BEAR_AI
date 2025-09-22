declare module 'crypto' {
  type BinaryLike = string | ArrayBuffer | ArrayBufferView;

  interface Hash {
    update(data: BinaryLike): Hash;
    digest(encoding: 'hex' | 'base64' | 'base64url'): string;
  }

  export function createHash(algorithm: string): Hash;
}

