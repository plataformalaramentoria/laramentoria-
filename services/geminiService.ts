import { GoogleGenerativeAI } from "@google/generative-ai";

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    console.warn("Gemini API Key not found. Please set VITE_GEMINI_API_KEY in .env.local");
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const sendMessageToAI = async (
  message: string, 
  history: ChatMessage[]
): Promise<string> => {
  const genAI = getClient();
  if (!genAI) return "Erro: Chave de API não configurada. Verifique o arquivo .env.local.";

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: "Você é uma assistente da Plataforma Lara Lopes, focada em mentoria acadêmica. Você deve ajudar com revisão de textos, sugestões de melhoria, análise de editais e simulação de entrevistas. Seja sempre polida, acadêmica e encorajadora. IMPORTANTE: Lembre sempre o usuário que você é uma ferramenta auxiliar e não substitui a orientação da professora humana."
    });

    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    
    return text || "Não foi possível gerar uma resposta.";
  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    return "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.";
  }
};