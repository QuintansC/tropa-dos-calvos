import App from "../../App.jsx";
import { loadAppProps } from "../load-app-props.js";

export const metadata = {
  title: "Perfil | Tropa do Calvo"
};

export const dynamic = "force-dynamic";

export default async function Profile() {
  const props = await loadAppProps();
  return <App {...props} page="profile" />;
}
