import App from "../../App.jsx";
import { loadAppProps } from "../load-app-props.js";

export const metadata = {
  title: "Acervo | Tropa do Calvo"
};

export const dynamic = "force-dynamic";

export default async function Recommendations() {
  const props = await loadAppProps();
  return <App {...props} page="recommendations" />;
}
