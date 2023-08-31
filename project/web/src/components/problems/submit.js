import {
  Button,
  Col,
  Row,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { useEffect, useState } from "react";
import TODO from "../misc/todo";
import { UploadOutlined } from "@ant-design/icons";
import Dragger from "antd/es/upload/Dragger";
import http from "../../utils/http";
import moment from "moment";

const ProbSubmit = ({ problem, fileFormat, fileSize, fileName }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState([]);
  const [canUpload, setCanUpload] = useState(false);
  const [filp, setFilp] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    http()
      .get(
        `/submissions/can?assignment=${problem.assignment}&problem=${problem.slug}`,
      )
      .then((res) => {
        setCanSubmit(res.data);
      })
      .catch((err) => console.log(err));
  }, [problem, filp]);

  const checkLimit = (cnt, limit) => {
    if (limit === -1) return true;
    return cnt < limit;
  };

  const checkDDL = (DDL) => {
    const now = moment();
    const ddl = moment(DDL).locale("zh-cn");
    return now.isBefore(ddl);
  };

  const handleUpload = () => {
    if (!canUpload || !canSubmit) return;
    setUploading(true);
    if (!file) return;
    // if(file.name !== fileName){setFile([]);message.err(`文件名不正确, 应为`)}
    if (canSubmit.can) {
      const formData = new FormData();
      formData.append("file", file[0]);
      formData.append("assignment", problem.assignment);
      formData.append("problem", problem.slug);
      http()
        .post("/submissions", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then(() => {
          setFile([]);
          message.success("提交成功!");
        })
        .catch((err) => {
          console.log(err);
          message.error("提交失败!");
          setFile([]);
        })
        .finally(() => {
          setFilp(!filp);
          setUploading(false);
          setCanUpload(false);
        });
      return;
    }
    const inLimit = checkLimit(canSubmit.count, canSubmit.limit);
    if (!inLimit) {
      message.error("超过提交次数限制!");
      setUploading(false);
      return;
    }
    const chkddl = checkDDL(canSubmit.ddl);
    if (!chkddl) {
      message.error("问题已截止!");
      setUploading(false);
      return;
    }
    message.error("不知道为什么, 但是不能提交");
    setUploading(false);
  };

  return (
    <>
      <Dragger
        name="file"
        fileList={file}
        multiple={false}
        maxCount={1}
        onRemove={() => {
          setCanUpload(false);
          setFile([]);
        }}
        accept={fileFormat}
        beforeUpload={(file) => {
          // console.log(file);
          setFile([file]);
          setCanUpload(true);
          return false;
        }}
      >
        <Typography.Text>
          <UploadOutlined />
          点击或拖拽提交
        </Typography.Text>
        {/* <Button icon={ <UploadOutlined /> }>
        上传
      </Button> */}
      </Dragger>
      <div style={{ marginTop: "2em" }}>
        <span style={{ float: "right" }}>
          <Button
            loading={uploading}
            disabled={!canUpload}
            onClick={handleUpload}
          >
            提交
          </Button>
        </span>
      </div>
    </>
  );
};

export default ProbSubmit;
