import {
  Button,
  Form,
  Input,
  InputNumber,
  Skeleton,
  Space,
  Typography,
} from "antd";
import FormItem from "antd/es/form/FormItem";
import { useEffect, useState } from "react";
import http from "../../../utils/http";

const AdminSubmissionGrader = ({
  submission,
  grader,
  onFinish,
  form,
  disabled,
}) => {
  return (
    grader &&
    grader.template && (
      <>
        <Form
          disabled={disabled}
          onFinish={onFinish}
          initialValues={grader.template.human}
        >
          {grader &&
            grader?.template?.human?.map((value, idx) => {
              return (
                <Form.Item name={idx}>
                  <Form.Item name={[idx, "title"]} label={"项目"}>
                    <Input readOnly bordered={false}></Input>
                  </Form.Item>
                  <Form.Item
                    name={[idx, "score"]}
                    label={"评分"}
                    rules={[{ required: true, message: "必须评一个分" }]}
                  >
                    <InputNumber min="0" max={value.maxscore} />
                  </Form.Item>
                  <Form.Item
                    name={[idx, "message"]}
                    label={"评语"}
                    rules={[{ required: true, message: "必须有评语" }]}
                  >
                    <Input />
                  </Form.Item>
                </Form.Item>
              );
            })}
          <Button htmlType="submit" style={{ float: "right" }} type="primary">
            完成评分
          </Button>
        </Form>
      </>
    )
  );
};

export default AdminSubmissionGrader;
