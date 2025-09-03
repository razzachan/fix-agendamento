import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function KnowledgePreview({ block }: { block: any }){
  const [message, setMessage] = useState('Gere uma resposta de exemplo com base no bloco.');
  const [output, setOutput] = useState('');
  const WEBHOOK = (import.meta as any).env?.VITE_WEBHOOK_AI || 'http://localhost:3100';

  const run = async () => {
    try {
      const res = await fetch(`${WEBHOOK}/ai/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, block })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Falha na IA');
      setOutput(data.preview || '');
    } catch (e:any) {
      toast.error('Falha ao rodar preview: ' + (e.message||e));
    }
  };

  return (
    <div className="mt-3 border rounded p-3 space-y-2">
      <div className="text-sm text-muted-foreground">Prévia da resposta da IA usando este bloco</div>
      <Textarea value={message} onChange={e=>setMessage(e.target.value)} rows={3}/>
      <Button onClick={run}>Gerar Preview</Button>
      {output && (
        <div className="mt-2 p-2 bg-muted rounded text-sm whitespace-pre-wrap">{output}</div>
      )}
    </div>
  );
}

