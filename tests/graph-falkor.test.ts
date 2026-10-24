// Runs the graph contract against a real FalkorDB. Uses the local Docker database by
// default (graph `ezcon_test`, deleted after each test) so the cloud lab data is untouched.
import { FalkorDB } from 'falkordb';
import { graphContract } from './graph-contract';
import { FalkorGraph } from '../server/graph';

const url = process.env.FALKORDB_TEST_URL ?? 'redis://127.0.0.1:6379';
const GRAPH = 'ezcon_test';
let db: FalkorDB | undefined;

graphContract(
  'FalkorDB',
  async () => {
    db ??= await FalkorDB.connect({ url, socket: { connectTimeout: 5000, reconnectStrategy: false } });
    return new FalkorGraph(db, GRAPH, async () => db!);
  },
  async () => {
    try {
      await db!.selectGraph(GRAPH).delete();
    } catch {
      // graph may not exist yet
    }
  },
);

afterAll(async () => {
  await db?.close();
});
