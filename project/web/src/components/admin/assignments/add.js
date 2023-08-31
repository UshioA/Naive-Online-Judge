import { useForm } from "antd/es/form/Form";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import http from "../../../utils/http";
import { Empty, message } from "antd";
import Role from "../../../utils/role";
import AssignForm from "./form";

const AssignAdd = () => {
  const [disabled, setDisabled] = useState(false);
  const history = useHistory();
  const [form] = useForm();
  const auth = useSelector((state) => state.auth.value);

  const onFinish = (values) => {
    setDisabled(true);
    http()
      .post("/assignments", {
        title: values.title,
        slug: values.slug,
        beginTime: values.rangeTime[0].toISOString(),
        endTime: values.rangeTime[1].toISOString(),
      })
      .then((res) => {
        if (res.status === 201) {
          message.success(`已创建作业`);
          history.goBack();
        } else if (res.status === 200) {
          message.error(`已存在代号为 ${values.slug} 的作业`);
        }
      })
      .catch((err) => {
        message.error(`创建作业失败`);
        setDisabled(false);
        console.log(err);
      });
  };

  return !Role.isLower(Role.Student, auth.user.role) ? (
    <Empty />
  ) : (
    <AssignForm
      form={form}
      disabled={disabled}
      initialValues={{}}
      isCreate={true}
      onFinish={onFinish}
      onReset={() => {
        setDisabled(true);
        history.goBack();
      }}
    />
  );
};

export default AssignAdd;
