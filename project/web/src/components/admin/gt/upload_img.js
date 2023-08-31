import { Typography } from "antd";
import Dragger from "antd/es/upload/Dragger";

const AdminGtImgUpload = ({ file, setFile, canUpload, setCanUpload, text }) => {
  return (
    <Dragger
      name="img"
      fileList={file}
      multiple={false}
      maxCount={1}
      onRemove={() => {
        setCanUpload(false);
        setFile([]);
      }}
      accept=".tar"
      beforeUpload={(file) => {
        setFile([file]);
        setCanUpload(true);
        return false;
      }}
    >
      {text || (
        <Typography.Text>点击或拖拽提交; 仅接受.tar格式文件</Typography.Text>
      )}
    </Dragger>
  );
};

export default AdminGtImgUpload;
