import assert from 'node:assert/strict';
import { FalkorDB } from 'falkordb';
import { CHECK_GRAPH, CHECK_PARAMS, SEED_QUERY, describeError } from './check-falkordb-lib.mjs';

const url = process.env.FALKORDB_URL;
assert.ok(url, 'FALKORDB_URL is required; use node --env-file=.env');
assert.ok(url.startsWith('falkors://'), 'Cloud check requires a TLS falkors:// URL');
let db;
try {
  db = await FalkorDB.connect({url, socket:{connectTimeout:10000, reconnectStrategy:false}});
  const graph = db.selectGraph(CHECK_GRAPH);
  const ping = await graph.query('RETURN 1 AS ok');
  assert.equal(ping.data[0].ok, 1);
  console.log('PASS connection: TLS query returned 1');
  await graph.query(SEED_QUERY, {params: CHECK_PARAMS});
  const counts = await graph.query('MATCH (n) RETURN count(n) AS nodes');
  const edges = await graph.query('MATCH ()-[r]->() RETURN count(r) AS edges');
  assert.ok(counts.data[0].nodes >= 5);
  assert.ok(edges.data[0].edges >= 4);
  console.log(`PASS data: ${CHECK_GRAPH} has ${counts.data[0].nodes} nodes and ${edges.data[0].edges} edges`);
  const paths = await graph.query(`MATCH p=(a:Attendee {id:'check:attendee'})-[:INTERESTED_IN]->(topic:Topic)<-[:ABOUT]-(t:Talk)<-[:PRESENTS]-(s:Speaker) RETURN p, a.name AS attendee, topic.name AS topic, t.name AS talk, s.name AS speaker`);
  assert.ok(paths.data.length && paths.data[0].p);
  const row=paths.data[0];
  console.log(`PASS path: ${row.attendee} → interested in ${row.topic} ← topic of ${row.talk} ← presented by ${row.speaker}`);
  await graph.query(`MATCH (a:Attendee {id:'check:attendee'}), (s:Speaker {id:'check:speaker'}) MERGE (a)-[m:MET {id:'check:meeting'}]->(s) SET m.synthetic=true, m.note='Setup fixture only; no actual meeting claimed'`);
  await db.close(); db=undefined;
  db = await FalkorDB.connect({url,socket:{connectTimeout:10000,reconnectStrategy:false}});
  const memory=await db.selectGraph(CHECK_GRAPH).query(`MATCH (:Attendee {id:'check:attendee'})-[m:MET]->(:Speaker {id:'check:speaker'}) RETURN count(m) AS meetings`);
  assert.equal(memory.data[0].meetings,1);
  console.log('PASS memory: one synthetic meeting survives reconnect; MERGE prevents duplicates');
} catch (error) {
  console.error('FAIL cloud check:', describeError(error, url));
  process.exitCode=1;
} finally { if(db) await db.close(); }
