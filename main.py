
from flask import Flask, request, jsonify
from supabase_client import registrar_agendamento

app = Flask(__name__)

@app.route("/", methods=["POST"])
def handle_agendamento():
    data = request.json
    response = registrar_agendamento(data)

    if response.status_code == 201:
        nome = data.get("nome", "").split(" ")[0]
        return jsonify({"mensagem": f"Perfeito, {nome}! Suas informações foram registradas. Em breve entraremos em contato para confirmar o melhor horário. 😊"})
    else:
        return jsonify({"mensagem": "Tivemos um problema ao registrar seu agendamento. Por favor, tente novamente ou fale com um atendente."})

if __name__ == "__main__":
    app.run(debug=True)
