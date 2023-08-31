import { Button, Col, DatePicker, Form, Input, InputNumber, Row } from "antd";
import FormItem from "antd/es/form/FormItem";
import { Markdown } from "../../../utils/mark";

const ProbForm = ({
  initialValues,
  form,
  disabled,
  onFinish,
  onReset,
  setEdit,
  isCreate = false,
}) => {
  return (
    <Form
      initialValues={initialValues}
      form={form}
      disabled={disabled}
      onFinish={onFinish}
      scrollToFirstError={true}
    >
      <FormItem name="assignment" disabled={true} label={`归属作业代号`}>
        <Input disabled readOnly />
      </FormItem>
      <FormItem
        name="slug"
        disabled={!isCreate}
        label={`问题代号`}
        rules={[
          {
            required: true,
            message: "简短的问题代号是必须的",
          },
          {
            pattern: /^[A-Za-z_0-9]+$/,
            message: "问题slug需满足`^[A-Za-z_0-9]+$`",
          },
        ]}
      >
        <Input disabled={!isCreate} />
      </FormItem>
      <FormItem
        name="title"
        disabled={disabled}
        label={`问题名称`}
        rules={[{ required: true, message: `请输入问题名称` }]}
      >
        <Input />
      </FormItem>
      <FormItem
        name="rangeTime"
        label="时间"
        rules={[{ required: true, message: `请输入时间` }]}
      >
        <DatePicker.RangePicker
          showTime
          format="YYYY-MM-DD HH:mm"
          disabled={true}
          readOnly
        />
      </FormItem>
      <FormItem
        name="submitFileType"
        label="提交文件格式"
        rules={[
          {
            required: true,
            message: `请输入格式`,
          },
          {
            pattern: /^\.[a-zA-Z0-9]+(,\s*\.[a-zA-Z0-9]+)*$/,
            message: `后缀格式错误, 要求^\\.[a-zA-Z0-9]+(,\\s*\\.[a-zA-Z0-9]+)*$`,
          },
        ]}
      >
        <Input />
      </FormItem>
      <FormItem
        name="submitFileSize"
        label="提交文件大小(MiB)"
        rules={[{ required: true, message: `请输入大小` }]}
      >
        <InputNumber min="1" max="10" />
      </FormItem>
      <FormItem
        name="submitCountLimit"
        label="提交次数限制"
        rules={[{ required: true, message: `请输入提交次数限制` }]}
      >
        <InputNumber min="-1" />
      </FormItem>
      <FormItem
        name="totalScore"
        label="满分"
        rules={[{ required: true, message: `请输入满分` }]}
      >
        <InputNumber min="0" />
      </FormItem>
      <FormItem name="description" label="问题描述">
        <Markdown
          hidetab={false}
          mode={"edit"}
          value={initialValues.description}
          onChange={setEdit}
        />
      </FormItem>
      <FormItem>
        <Row gutter={24}>
          <Col>
            <Button type="primary" htmlType="submit">
              提交
            </Button>
          </Col>
          <Col>
            <Button onClick={onReset}>放弃</Button>
          </Col>
        </Row>
      </FormItem>
    </Form>
  );
};

export default ProbForm;
