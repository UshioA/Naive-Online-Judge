import { Button, Col, DatePicker, Form, Input, Row } from "antd";
import FormItem from "antd/es/form/FormItem";

const AssignForm = ({
  initialValues,
  isCreate,
  onFinish,
  onReset,
  disabled,
  form,
}) => {
  return (
    <Form
      initialValues={initialValues}
      disabled={disabled}
      onFinish={onFinish ?? (() => {})}
      onReset={onReset ?? (() => {})}
      form={form}
    >
      <FormItem
        disabled={!isCreate || disabled}
        name={"slug"}
        label={`作业代号`}
        rules={[{ required: true, message: "作业代号是必须的" }]}
      >
        <Input disabled={!isCreate || disabled} />
      </FormItem>
      <FormItem
        disabled={disabled}
        name="title"
        label={`作业名称`}
        rules={[{ required: true, message: `作业名称是必须的` }]}
      >
        <Input disabled={disabled} />
      </FormItem>
      <FormItem
        disabled={disabled}
        name="rangeTime"
        label={`起止时间`}
        rules={[{ required: true, message: `起止时间是必须的` }]}
      >
        <DatePicker.RangePicker
          showTime
          format={"YYYY-MM-DD HH:mm"}
          disabled={disabled}
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

export default AssignForm;
