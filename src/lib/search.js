// FTS query + normalization.  Manual §4.8
// Normalize the query the same way the indexed text was normalized, or Arabic
// searches silently miss.
import { normalize } from './arabic.js';

export async function search(query) {
  throw new Error('TODO §4.8');
}
