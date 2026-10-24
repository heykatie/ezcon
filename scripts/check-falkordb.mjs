import assert from 'node:assert/strict';
import { FalkorDB } from 'falkordb';

const url = process.env.FALKORDB_URL;
assert.ok(url, 'FALKORDB_URL is required; use node --env-file=.env');
assert.ok(url.startsWith('falkors://'), 'Cloud check requires a TLS falkors:// URL');
let db;
try {
  db = await FalkorDB.connect({url, socket:{connectTimeout:10000, reconnectStrategy:false}});
  const graph = db.selectGraph('conference');
  const ping = await graph.query('RETURN 1 AS ok');
  assert.equal(ping.data[0].ok, 1);
  console.log('PASS connection: TLS query returned 1');
  const params = {source:'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-making-works-on-all'};
  await graph.query(`MERGE (a:Attendee {id:'ezcon:synthetic-attendee'}) SET a.name='Demo attendee (fictional)', a.synthetic=true
    MERGE (t:Talk {id:'ezcon:wad26:1917'}) SET t.name='Making Works on All Machines Work for Agent Environments', t.source=$source, t.starts='2026-09-23T10:00:00', t.ends='2026-09-23T10:30:00'
    MERGE (s:Speaker {id:'ezcon:wad26:michael-irwin'}) SET s.name='Michael Irwin', s.company='Docker', s.source=$source
    MERGE (topic:Topic {id:'ezcon:agent-environments'}) SET topic.name='Agent environments', topic.evidence='derived from session description'
    MERGE (r:Room {id:'ezcon:wad26:stage1'}) SET r.name='Stage 1', r.source=$source
    MERGE (s)-[:PRESENTS]->(t) MERGE (t)-[:ABOUT]->(topic) MERGE (t)-[:IN_ROOM]->(r) MERGE (a)-[:INTERESTED_IN]->(topic)`, {params});
  const counts = await graph.query('MATCH (n) RETURN count(n) AS nodes');
  const edges = await graph.query('MATCH ()-[r]->() RETURN count(r) AS edges');
  assert.ok(counts.data[0].nodes >= 5);
  assert.ok(edges.data[0].edges >= 4);
  console.log(`PASS data: conference has ${counts.data[0].nodes} nodes and ${edges.data[0].edges} edges`);
  const paths = await graph.query(`MATCH p=(a:Attendee {id:'ezcon:synthetic-attendee'})-[:INTERESTED_IN]->(topic:Topic)<-[:ABOUT]-(t:Talk)<-[:PRESENTS]-(s:Speaker) RETURN p, a.name AS attendee, topic.name AS topic, t.name AS talk, s.name AS speaker`);
  assert.ok(paths.data.length && paths.data[0].p);
  const row=paths.data[0];
  console.log(`PASS path: ${row.attendee} → interested in ${row.topic} ← topic of ${row.talk} ← presented by ${row.speaker}`);
  await graph.query(`MATCH (a:Attendee {id:'ezcon:synthetic-attendee'}), (s:Speaker {id:'ezcon:wad26:michael-irwin'}) MERGE (a)-[m:MET {id:'ezcon:synthetic-meeting'}]->(s) SET m.synthetic=true, m.note='Setup fixture only; no actual meeting claimed'`);
  await db.close(); db=undefined;
  db = await FalkorDB.connect({url,socket:{connectTimeout:10000,reconnectStrategy:false}});
  const memory=await db.selectGraph('conference').query(`MATCH (:Attendee {id:'ezcon:synthetic-attendee'})-[m:MET]->(:Speaker {id:'ezcon:wad26:michael-irwin'}) RETURN count(m) AS meetings`);
  assert.equal(memory.data[0].meetings,1);
  console.log('PASS memory: one synthetic meeting survives reconnect; MERGE prevents duplicates');
} catch (error) {
  console.error('FAIL cloud check:', error.code || error.name || 'connection/query error');
  process.exitCode=1;
} finally { if(db) await db.close(); }
