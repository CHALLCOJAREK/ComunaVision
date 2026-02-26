import { useEffect, useState } from "react";
import { camposService, CampoFormulario } from "../../services/camposService";

export default function DebugCamposPage() {
  const [data, setData] = useState<CampoFormulario[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    camposService.listar()
      .then(setData)
      .catch((e) => setErr(e?.message || "Error"));
  }, []);

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2>Debug Campos</h2>
      {err && <pre style={{ color: "tomato" }}>{err}</pre>}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}