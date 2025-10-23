import axios from "axios";

// Базовий URL із змінної оточення + '/api'
const baseURL = process.env.NEXT_PUBLIC_API_URL + "/api";

// Інстанс для власних Next.js API route (використовує відносний шлях)
export const nextServer = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Інстанс для зовнішнього API (через базовий URL із змінної середовища)
export const api = axios.create({
  baseURL,
  withCredentials: true,
});
