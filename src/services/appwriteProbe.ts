export async function probeAppwritePublic(endpoint: string) {
  try {
    const res = await fetch(`${endpoint.replace(/\/+$/,'')}/avatars/flags/us`);
    return res.ok; // 200 = reachable
  } catch (e) {
    console.log("Probe error:", e);
    return false;
  }
}