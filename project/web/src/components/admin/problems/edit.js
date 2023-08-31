import { useForm } from "antd/es/form/Form";
import { useEffect, useState } from "react";
import {
  useHistory,
  useParams,
} from "react-router-dom/cjs/react-router-dom.min";
import http from "../../../utils/http";
import ProbForm from "./form";
import { Empty, message } from "antd";
import { useSelector } from "react-redux";
import Role from "../../../utils/role";
import todayjs from "../../../utils/todayjs";

const ProbEdit = () => {
  const [source, setSource] = useState("");
  const [edit, setEdit] = useState(true);
  const [form] = useForm();
  const [assignment, setAssignment] = useState(null);
  const [problem, setProblem] = useState(null);
  const { aslug, bslug } = useParams();
  const [disabled, setDisabled] = useState(false);
  const history = useHistory();
  const auth = useSelector((state) => state.auth.value);

  useEffect(() => {
    http()
      .get(`/assignments?slug=${aslug}`)
      .then((res) => {
        setAssignment(res.data);
      })
      .catch((err) => {
        console.log(err);
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
      .put("/problems", data)
      .then(() => {
        message.success("已修改作业");
        history.goBack();
      })
      .catch((err) => {
        console.log(err);
        message.error(`出现错误!`);
      });
    setDisabled(false);
  };

  useEffect(() => {
    http()
      .get(`/problems?assignment=${aslug}&slug=${bslug}`)
      .then((res) => {
        setProblem(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [aslug, bslug]);

  return Role.isLower(Role.Student, auth.user.role) && assignment && problem ? (
    <>
      <ProbForm
        initialValues={{
          assignment: problem.assignment,
          slug: problem.slug,
          rangeTime: [
            todayjs(assignment.beginTime),
            todayjs(assignment.endTime),
          ],
          submitFileType: problem.submitFileType,
          submitFileSize: problem.submitFileSize,
          submitCountLimit: problem.submitCountLimit,
          description: problem.description,
          title: problem.title,
          totalScore: problem.totalScore,
        }}
        form={form}
        disabled={disabled}
        onFinish={onFinish}
        isCreate={false}
        onReset={() => history.goBack()}
      ></ProbForm>
    </>
  ) : (
    <Empty />
  );
};

export default ProbEdit;
