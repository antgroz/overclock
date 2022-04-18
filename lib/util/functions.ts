export function asyncify<R>(
  executable: () => R | Promise<R>
): () => Promise<R> {
  return async () => executable();
}
