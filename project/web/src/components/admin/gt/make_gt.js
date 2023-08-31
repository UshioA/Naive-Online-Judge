import {
  MinusCircleOutlined,
  PlusOutlined,
  LoadingOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import http from "../../../utils/http";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import AdminGtImgUpload from "./upload_img";

const AdminGtMaker = ({ isEdit, slug }) => {
  const [form] = Form.useForm();
  const [disabled, setDisabled] = useState(false);
  const [refetch, setRefetch] = useState(false);
  const history = useHistory();
  const [ismachine, setIsMachine] = useState(false);
  const [usemachine, setUseMachine] = useState(false);
  const [file, setFile] = useState([]);
  const [canUpload, setCanUpload] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showBuildLog, setShowBuildLog] = useState(false);

  const [gt, setGt] = useState(null);

  const deleteGtImg = () => {
    if (slug)
      http()
        .delete(`/gt/image?slug=${slug}`)
        .then((res) => {
          message.success(`已删除`);
          setRefetch(!refetch);
        })
        .catch((err) => {
          console.error(err);
          message.error("未能删除");
          setRefetch(!refetch);
        });
  };

  useEffect(() => {
    if (slug)
      http()
        .get(`/gt?slug=${slug}`)
        .then((res) => {
          setGt(res.data);
          setMsg(res.data.message);
          setIsMachine(!res.data.ishuman);
          setUseMachine(!res.data.ishuman);
        })
        .catch((err) => {
          console.error(err);
        });
  }, [slug, refetch]);

  useEffect(() => {
    if (ismachine && gt && !gt.built && !gt.error) {
      setTimeout(() => setRefetch(!refetch), 2000);
    }
  }, [gt, ismachine, refetch]);

  const handleUpload = () => {
    if (!canUpload || !isEdit) return;
    const f = new FormData();
    f.append("slug", slug);
    f.append("file", file[0]);
    http()
      .post("/gt/image", f, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        setFile([]);
        message.success("镜像提交成功!");
        setRefetch(!refetch);
      })
      .catch((err) => {
        message.error("镜像提交失败");
        console.error(err);
        setFile([]);
        setRefetch(!refetch);
      });
    setFile([]);
  };

  const onFinish = (values) => {
    setDisabled(true);
    if (ismachine) return;
    if (usemachine) {
      handleUpload();
      setDisabled(false);
      return;
    }
    // if (!values || (values.items === undefined) || values.items.length === 0) {
    //   message.error("请至少包含一项!");
    //   setDisabled(false);
    //   return;
    // }
    if (isEdit) {
      http()
        .put("/gt", {
          ishuman: true,
          slug: values.slug,
          human:
            values.items === undefined
              ? null
              : values.items.map((a) => {
                  return { ...a, score: 0 };
                }),
        })
        .then((res) => {
          message.success("修改成功");
        })
        .catch((err) => {
          message.error("修改失败");
          console.error(err);
        });
    } else {
      http()
        .post("/gt", {
          ishuman: true,
          slug: values.slug,
          human:
            values.items === undefined
              ? null
              : values.items.map((a) => {
                  return { ...a, score: 0 };
                }),
        })
        .then((res) => {
          if (res.status === 201) message.success("创建成功");
          else message.error("已存在相同slug的模板");
        })
        .catch((err) => {
          message.error("创建失败");
          console.error(err);
        });
    }
    history.goBack();
    setDisabled(false);
  };
  return !isEdit || gt ? (
    <Form
      disabled={disabled}
      form={form}
      name="make_gt"
      onFinish={onFinish}
      style={{
        maxWidth: 800,
      }}
      autoComplete="off"
    >
      <Form.Item
        name="slug"
        label="slug"
        disabled={disabled}
        initialValue={slug ?? ""}
        rules={[
          {
            required: true,
            message: "缺少slug",
          },
          {
            pattern: /^[a-z_0-9]+$/,
            message: "slug需满足`^[a-z_0-9]+$`",
          },
        ]}
      >
        <Input disabled={disabled || isEdit} />
      </Form.Item>
      {ismachine ? (
        <>
          <Descriptions>
            <Descriptions.Item label="自动评分">
              {gt.ishuman ? (
                <>未设置</>
              ) : (
                <>
                  已设置，
                  {!gt.imagetag ? (
                    <>
                      {gt.error ? (
                        <>编译失败，请查看编译日志</>
                      ) : (
                        <>
                          正在编译Docker镜像{" "}
                          <LoadingOutlined
                            style={{ marginLeft: "1em", marginRight: "1em" }}
                          />
                          Tag：<code>{gt.imagetag}</code>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      Docker镜像 Tag：<code>{gt.imagetag}</code>
                    </>
                  )}
                  <Typography.Link
                    style={{ marginLeft: 20 }}
                    onClick={() => setShowBuildLog(!showBuildLog)}
                  >
                    查看编译日志
                  </Typography.Link>
                  <Popconfirm
                    title="确定要删除自动评分文件吗？"
                    onConfirm={deleteGtImg}
                  >
                    <Typography.Link
                      type="danger"
                      style={{ marginLeft: "1.5em" }}
                    >
                      <DeleteOutlined /> 删除自动评分文件
                    </Typography.Link>
                  </Popconfirm>
                </>
              )}
            </Descriptions.Item>
          </Descriptions>

          {showBuildLog ? (
            <Card
              style={{
                marginBottom: 10,
                minHeight: 300,
                maxHeight: 600,
                overflow: "auto",
              }}
            >
              <pre style={{ whiteSpace: "pre-wrap" }}>
                <code>{msg}</code>
              </pre>
            </Card>
          ) : (
            <></>
          )}
        </>
      ) : (
        <>
          {usemachine ? (
            <AdminGtImgUpload
              file={file}
              setFile={setFile}
              canUpload={canUpload}
              setCanUpload={setCanUpload}
            />
          ) : (
            <>
              <Form.List form={form} name="items">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Space key={field.key}>
                        <Form.Item
                          {...field}
                          label="标题"
                          name={[field.name, "title"]}
                          disabled={disabled || isEdit}
                          rules={[
                            {
                              required: true,
                              message: "缺少标题",
                            },
                          ]}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          label="满分"
                          name={[field.name, "maxscore"]}
                          rules={[
                            {
                              required: true,
                              message: "缺少满分",
                            },
                          ]}
                        >
                          <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item
                          label="描述"
                          name={[field.name, "message"]}
                          rules={[
                            {
                              required: true,
                              message: "缺少描述",
                            },
                          ]}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item>
                          <MinusCircleOutlined
                            onClick={() => remove(field.name)}
                          />
                        </Form.Item>
                      </Space>
                    ))}

                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<PlusOutlined />}
                      >
                        增加一项评分项
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </>
          )}
          {isEdit !== undefined && isEdit ? (
            <Form.Item>
              <Checkbox
                checked={usemachine}
                onChange={() => setUseMachine(!usemachine)}
              >
                使用机器评分
              </Checkbox>
            </Form.Item>
          ) : (
            <></>
          )}
        </>
      )}
      {ismachine ? (
        <></>
      ) : (
        <Form.Item>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
        </Form.Item>
      )}
    </Form>
  ) : (
    <></>
  );
};
export default AdminGtMaker;
