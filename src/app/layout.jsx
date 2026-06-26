import "../styles.css";

export const metadata = {
  title: "Tropa do Calvo | Clube do Livro",
  description: "Clube do livro da Tropa do Calvo com recomendações, sugestões e sorteios."
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
