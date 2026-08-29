import { useMutation } from '@tanstack/react-query'
import { requestSearchVector } from '../api/searchApi'

export function useSearchVector() {
  return useMutation({
    mutationFn: requestSearchVector,
  })
}
