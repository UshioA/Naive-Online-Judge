import { useParams } from "react-router-dom/cjs/react-router-dom.min";
import AdminGtMaker from "./make_gt";

const AdminGtEditor = () => {
  const { slug } = useParams();
  return <AdminGtMaker isEdit={true} slug={slug} />;
};

export default AdminGtEditor;
