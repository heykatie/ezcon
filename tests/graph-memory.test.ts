import { graphContract } from './graph-contract';
import { MemoryGraph } from '../src/domain/memory-graph';

// The persisted state object stands in for browser storage across "sessions".
let persisted: Record<string, unknown> = {};
graphContract(
  'in-browser',
  async () => {
    persisted = {};
    return new MemoryGraph({ load: () => persisted.state as never, save: (s) => (persisted.state = structuredClone(s)) });
  },
);
