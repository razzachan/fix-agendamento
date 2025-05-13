from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import inserir_agendamento
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/")
async def receber_dados(request: Request):
    dados = await request.json()
    nome = dados.get("nome")
    endereco = dados.get("endereco")
    equipamento = dados.get("equipamento")
    problema = dados.get("problema")

    # O técnico padrão é Paulo Cesar, exceto para coifas
    tecnico = "Marcelo (marcelodsmoritz@gmail.com)" if "coifa" in equipamento.lower() else "Paulo Cesar (betonipaulo@gmail.com)"

    inserido = inserir_agendamento(
        nome=nome,
        endereco=endereco,
        equipamento=equipamento,
        problema=problema,
        urgente=False,
        status="pendente",
        tecnico=tecnico
    )

    if inserido:
        return {"mensagem": f"Agendamento registrado com sucesso. Em breve nossa equipe irá roteirizar o melhor horário e retornará a confirmação 😊"}
    else:
        return {"mensagem": "Houve um erro ao registrar o agendamento. Por favor, tente novamente mais tarde."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
