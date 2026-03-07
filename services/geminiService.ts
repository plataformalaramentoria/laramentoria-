import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const sendMessageToAI = async (
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[]
): Promise<string> => {
  const client = getClient();
  if (!client) return "Erro: Chave de API não configurada.";

  try {
    const model = client.models;
    
    // Convert history to format expected by API if needed, 
    // but for simple single-turn or managed chat we can use generateContent or chat.
    // Here we maintain a chat session.
    
    const chat = client.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `Você é uma assistente de mentoria acadêmica para mestrado. 
        Você deve ajudar com revisão de textos, sugestões de melhoria, análise de editais e simulação de entrevistas.
        Seja sempre polida, acadêmica e encorajadora.
        IMPORTANTE: Lembre sempre o usuário que você é uma ferramenta auxiliar e não substitui a orientação da professora humana.`,
      },
      history: history
    });

    const result = await chat.sendMessage({ message });
    return result.text || "Não foi possível gerar uma resposta.";
  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    return "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.";
  }
};