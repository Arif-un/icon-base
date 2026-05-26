// Types for the result object with discriminated union
interface Success<T> {
  data: T
  error: undefined
}

interface Failure<E> {
  data: undefined
  error: E
}

type Result<T, E = Error> = Failure<E> | Success<T>

// Main wrapper function
export async function tryCatch<T, E = Error>(promise: WPStarterKitPromise<T>): WPStarterKitPromise<Result<T, E>> {
  try {
    const data = await promise

    return { data, error: undefined }
  } catch (error) {
    return { data: undefined, error: error as E }
  }
}
