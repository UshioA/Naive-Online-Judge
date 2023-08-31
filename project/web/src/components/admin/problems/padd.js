import { Empty, message } from "antd";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  useHistory,
  useParams,
} from "react-router-dom/cjs/react-router-dom.min";
import Role from "../../../utils/role";
import ProbForm from "./form";
import { useForm } from "antd/es/form/Form";
import http from "../../../utils/http";
import todayjs from "../../../utils/todayjs";

const ProbAdd = () => {
  const { aslug } = useParams();
  const auth = useSelector((state) => state.auth.value);
  const [assignment, setAssignment] = useState(null);
  const [form] = useForm();
  const [disabled, setDisabled] = useState(false);
  const history = useHistory();

  useEffect(() => {
    http()
      .get(`/assignments?slug=${aslug}`)
      .then((res) => {
        setAssignment(res.data);
      })
      .catch((err) => {
        console.log(err);
        message.error("未能获取作业!");
      });
  }, [aslug]);

  const onFinish = (values) => {
    setDisabled(true);
    const data = {
      assignment: values.assignment,
      slug: values.slug,
      title: values.title,
      description: values.description,
      submitFileType: values.submitFileType,
      submitFileSize: values.submitFileSize,
      submitCountLimit: values.submitCountLimit,
      totalScore: values.totalScore,
    };

    http()
      .post("/problems", data)
      .then((res) => {
        if (res.status === 201) {
          message.success("已创建作业");
          history.goBack();
        } else if (res.status === 200) {
          message.error(`已存在代号相同的作业`);
          setDisabled(false);
        }
      })
      .catch((err) => {
        console.log(err);
        message.error(`出现错误!`);
      });
    setDisabled(false);
  };

  return !Role.isLower(Role.Student, auth.user.role) || !assignment ? (
    <Empty />
  ) : (
    <ProbForm
      isCreate={true}
      initialValues={{
        assignment: assignment.slug,
        rangeTime: [todayjs(assignment.beginTime), todayjs(assignment.endTime)],
      }}
      form={form}
      disabled={disabled}
      onFinish={onFinish}
      onReset={() => history.goBack()}
    />
  );
};

export default ProbAdd;
