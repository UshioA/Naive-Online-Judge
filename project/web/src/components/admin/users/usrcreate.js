import { Button, Form, Input, Segmented, message } from "antd";
import { useForm } from "antd/es/form/Form";
import Layout from "antd/es/layout/layout";
import FormItem from "antd/es/form/FormItem";
import Role from "../../../utils/role";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { useState } from "react";
import http from "../../../utils/http";

const UsrCreate = () => {
  const [form] = useForm();
  const auth = useSelector((state) => state.auth.value);
  const history = useHistory();
  const [disabled, setDisabled] = useState(false);

  const onFinish = (values) => {
    setDisabled(true);
    const data = {
      username: values.username,
      fullname: values.fullname,
      role: values.role === "student" ? 2 : values.role === "staff" ? 1 : -1,
    };

    http()
      .post("/users", data)
      .then((res) => {
        if (res.status === 201) {
          message.success("创建成功");
          history.push("/admin/umanage");
        } else if (res.status === 200) {
          message.error("用户已被创建");
          form.resetFields();
          setDisabled(false);
        }
      })
      .catch((err) => {
        message.error("发生了错误");
        form.resetFields();
        setDisabled(false);
        console.log(err);
      });
  };

  return (
    <Layout>
      <Form
        initialValues={{
          username: "",
          fullname: "",
          role: "student",
        }}
        wrapperCol={{ span: 8 }}
        layout="horizontal"
        onFinish={onFinish}
        form={form}
        disabled={disabled}
      >
        <FormItem
          name={"fullname"}
          label={"姓名"}
          rules={[
            {
              required: true,
              message: "姓名为空",
            },
          ]}
        >
          <Input></Input>
        </FormItem>
        <FormItem
          name={"username"}
          label={"学号"}
          rules={[
            {
              required: true,
              message: "学号为空",
            },
          ]}
        >
          <Input></Input>
        </FormItem>
        <FormItem name={"role"} label={"角色"} required>
          <Segmented
            defaultValue={"student"}
            options={[
              {
                label: <>🤓 助教</>,
                value: "staff",
                disabled: Role.isLower(auth.user.role, Role.Admin),
              },
              {
                label: <>😀 学生</>,
                value: "student",
              },
            ]}
          ></Segmented>
        </FormItem>
        <FormItem>
          <Button type="primary" htmlType="submit">
            创建
          </Button>
        </FormItem>
      </Form>
    </Layout>
  );
};

export default UsrCreate;
