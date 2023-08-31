import {
  Button,
  Descriptions,
  Select,
  Skeleton,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { RedoOutlined } from "@ant-design/icons";
import {
  useHistory,
  useParams,
} from "react-router-dom/cjs/react-router-dom.min";
import http from "../../../utils/http";
import TODO from "../../misc/todo";
import Dragger from "antd/es/upload/Dragger";
import AdminGtImgUpload from "../gt/upload_img";

const AdminGraderChooser = () => {
  const { aslug, bslug } = useParams();
  const [gtlist, setGtlist] = useState(null);
  const [grader, setGrader] = useState(null);
  const [hasGrader, setHasGrader] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [flip, setFlip] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [file, setFile] = useState([]);
  const [loading, setLoading] = useState(false);
  const history = useHistory();

  const handleUpload = () => {
    if (!canUpload || !grader) return;
    setLoading(true);
    const f = new FormData();
    f.append("assignment", grader.grader.assignment);
    f.append("problem", grader.grader.problem);
    f.append("file", file[0]);
    http()
      .post("/grader/file", f, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        setFile([]);
        message.success("文件提交成功!");
        setLoading(false);
        setFlip(!flip);
        setCanUpload(false);
      })
      .catch((err) => {
        message.error("文件提交失败");
        console.error(err);
        setFile([]);
        setFlip(!flip);
        setLoading(false);
        setCanUpload(false);
      });
  };

  const deleteGraderFile = () => {
    if (!grader) return;
    http()
      .delete("/grader/file", {
        params: {
          assignment: grader.grader.assignment,
          problem: grader.grader.problem,
        },
      })
      .then((res) => {
        setFlip(!flip);
        message.success("删除成功");
      })
      .catch((err) => {
        setFlip(!flip);
        message.error("删除失败");
      });
  };

  const bindGt = (gtindex) => {
    const gt = gtlist[gtindex];
    http()
      .post("/grader", {
        assignment: aslug,
        problem: bslug,
        template: gt.slug,
      })
      .then((res) => {
        setFlip(!flip);
        message.success("绑定成功");
      })
      .catch((err) => {
        setFlip(!flip);
        message.error("绑定失败");
        console.error(err);
      });
  };

  const unBindGt = (gt) => {
    http()
      .delete("/grader", {
        params: {
          assignment: gt.assignment,
          problem: gt.problem,
        },
      })
      .then((res) => {
        setFlip(!flip);
        message.success("已解除绑定");
      })
      .catch((err) => {
        message.error("解除绑定失败");
        console.error(err);
        setFlip(!flip);
      });
  };

  useEffect(() => {
    http()
      .get("/gt/all")
      .then((res) => {
        setGtlist(res.data.gts);
      })
      .catch((err) => {
        console.error(err);
        message.error("获取评分模板列表失败");
        setError(true);
      });
  }, [flip]);

  useEffect(() => {
    http()
      .get("/grader", {
        params: {
          assignment: aslug,
          problem: bslug,
        },
      })
      .then((res) => {
        setGrader(res.data);
        setHasGrader(true);
      })
      .catch((err) => {
        if (err.response.status === 404) {
          setGrader(null);
          setHasGrader(false);
        } else {
          console.error(err);
          setError(true);
        }
      });
  }, [aslug, bslug, flip]);

  return (
    <>
      <Typography.Title level={2}>选择Grader</Typography.Title>
      {error ? (
        <Skeleton />
      ) : (
        <>
          {hasGrader && grader ? (
            <div>
              <Descriptions title="模板信息">
                <Descriptions.Item label={"slug"}>
                  {grader.template.slug}
                </Descriptions.Item>
                <Descriptions.Item label={"类型"}>
                  <Tag>{grader.template.ishuman ? "人工评分" : "自动评分"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={"文件状态"}>
                  <Tag>{grader.grader.hasfile ? "已上传" : "未上传"}</Tag>
                  {grader.grader.hasfile ? (
                    <Button type="link" onClick={deleteGraderFile}>
                      <Typography.Text type="danger">清除文件</Typography.Text>
                    </Button>
                  ) : (
                    <></>
                  )}
                </Descriptions.Item>
              </Descriptions>
              {!grader.template.ishuman ? (
                <>
                  {" "}
                  <AdminGtImgUpload
                    text={
                      grader.grader.hasfile ? (
                        <Typography.Text type="danger">
                          {"要想上传新文件, 首先需要删除旧文件"}
                        </Typography.Text>
                      ) : null
                    }
                    file={file}
                    setFile={setFile}
                    canUpload={canUpload}
                    setCanUpload={setCanUpload}
                  />
                  <Button
                    loading={loading}
                    style={{ float: "right", marginTop: "2em" }}
                    type="primary"
                    disabled={loading || !canUpload}
                    onClick={handleUpload}
                  >
                    提交文件
                  </Button>
                </>
              ) : (
                <></>
              )}
              <Button
                style={{ float: "left", marginTop: "2em" }}
                type="primary"
                onClick={() => unBindGt(grader.grader)}
              >
                解除绑定
              </Button>
            </div>
          ) : (
            <div>
              <Select
                style={{ minWidth: 120 }}
                loading={!gtlist}
                defaultValue={selected}
                onChange={(value) => {
                  setSelected(value);
                }}
                placeholder="选择一个 grader template"
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={
                  gtlist
                    ? gtlist.map((value, index) => {
                        return {
                          value: index,
                          label: value.slug,
                        };
                      })
                    : []
                }
              />
              <Button
                style={{ marginLeft: "2em" }}
                disabled={selected == null}
                type="primary"
                onClick={() => bindGt(selected)}
              >
                绑定此 Template
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default AdminGraderChooser;
