// Helpers de cliente (navegador).

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Lee un File a base64 sin el prefijo "data:...;base64,".
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
