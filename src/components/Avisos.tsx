import { Link } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { AVISO_LABEL, avisoDe, formatDateTime, type Appointment, type Resident } from "@/lib/acs";
import { HeartbeatLoader } from "./HeartbeatLoader";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AvisosList({
  appointments,
  residents,
  vazio = "Nenhuma consulta ou exame nas próximas 48 horas.",
}: {
  appointments: Appointment[];
  residents: Resident[];
  vazio?: string;
}) {
  const alertas = appointments
    .filter((a) => a.status === "pendente" && avisoDe(a.data_hora) !== null)
    .sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora));

  if (!alertas.length) {
    return <p className="text-sm text-muted-foreground">{vazio}</p>;
  }

  return (
    <ul className="space-y-3">
      {alertas.map((a) => {
        const nivel = avisoDe(a.data_hora)!;
        const morador = residents.find((r) => r.id === a.resident_id);
        return (
          <li
            key={a.id}
            className="hover-lift flex items-center justify-between gap-3 rounded-xl border bg-card/50 p-4 transition-colors hover:bg-card"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{a.titulo}</p>
              <p className="truncate text-sm text-muted-foreground">
                {morador ? `${morador.nome} • ` : ""}
                {formatDateTime(a.data_hora)}
                {a.local ? ` • ${a.local}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge variant={nivel === "48h" ? "secondary" : "destructive"}>
                {AVISO_LABEL[nivel]}
              </Badge>
              {nivel === "24h" && <HeartbeatLoader size="sm" className="scale-75 opacity-80" />}
            </div>

          </li>
        );
      })}
    </ul>
  );
}

export function AvisosCard({
  appointments,
  residents,
}: {
  appointments: Appointment[];
  residents: Resident[];
}) {
  return (
    <Card className="glass-card border-none overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 font-[Sora,sans-serif] text-base">
          <BellRing className="size-4 text-primary" /> Avisos de 48h e 24h
        </CardTitle>
        <Link to="/avisos" className="text-sm text-primary underline-offset-2 hover:underline">
          ver todos
        </Link>
      </CardHeader>
      <CardContent>
        <AvisosList appointments={appointments} residents={residents} />
      </CardContent>
    </Card>
  );
}
