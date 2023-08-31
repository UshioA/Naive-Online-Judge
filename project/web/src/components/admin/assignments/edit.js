import { useEffect, useState } from "react";
import {
  useHistory,
  useParams,
} from "react-router-dom/cjs/react-router-dom.min";
import http from "../../../utils/http";
import { Empty, Spin, message } from "antd";
import AssignForm from "./form";
import todayjs from "../../../utils/todayjs";
import Role from "../../../utils/role";
import { useSelector } from "react-redux";
import { useForm } from "antd/es/form/Form";

const AssignEdit = () => {
  const { aslug } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const history = useHistory();
  const auth = useSelector((state) => state.auth.value);
  const [form] = useForm();

  useEffect(() => {
    http()
      .get(`/assignments?slug=${aslug}`)
      .then((res) => {
        setAssignment({
          ...res.data,
          rangeTime: [todayjs(res.data.beginTime), todayjs(res.data.endTime)],
        });
      })
      .catch((err) => {
        message.error(`获取代号为 ${aslug} 的作业失败!`);
        console.log(err);
      });
  }, [aslug]);

  const onFinish = (values) => {
    setDisabled(true);
    http()
      .put("/assignments", {
        title: values.title,
        slug: values.slug,
        beginTime: values.rangeTime[0].toISOString(),
        endTime: values.rangeTime[1].toISOString(),
        id: assignment.id,
      })
      .then((res) => {
        message.success(`成功修改作业`);
        history.goBack();
      })
      .catch((err) => {
        message.error(`没能修改作业`);
        setDisabled(false);
        console.log(err);
      });
  };

  return (
    <Spin spinning={!assignment}>
      {!Role.isLower(Role.Student, auth.user.role) || !assignment ? (
        <Empty />
      ) : (
        <AssignForm
          form={form}
          disabled={disabled}
          initialValues={assignment}
          isCreate={false}
          onFinish={onFinish}
          onReset={() => {
            setDisabled(true);
            history.goBack();
          }}
        />
      )}
    </Spin>
  );
};

export default AssignEdit;
