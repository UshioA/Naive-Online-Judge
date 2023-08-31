import { Button, Col, Form, Input, Radio, Row, Typography } from "antd";
import FormItem from "antd/es/form/FormItem";
import { canWriteUser } from "../utils/role";

const UserConfig = ({
  user,
  self,
  form,
  onFinish,
  onReset,
  onCheck,
  disabled,
  labelCol,
  wrapperCol,
}) => {
  return (
    <div>
      <Form
        initialValues={{
          id: user.id,
          fullname: user.fullname,
          username: user.username,
          email: user.email,
          role: user.role,
          gitlabid: user.gitlabid,
          gongde: user.gongde,
        }}
        layout="horizontal"
        labelCol={labelCol || {}}
        wrapperCol={wrapperCol || {}}
        onFinish={onFinish || (() => {})}
        form={form}
        disabled={disabled || !canWriteUser(self, user)}
      >
        <FormItem name="id" label="ID">
          <Input bordered={false} readOnly></Input>
        </FormItem>
        <FormItem
          name="fullname"
          label="姓名"
          rules={[
            {
              required: true,
              massage: "用户名为空",
            },
          ]}
        >
          <Input
            bordered={true}
            placeholder="请输入姓名"
            name="fullname"
          ></Input>
        </FormItem>
        <FormItem name="username" label="学号">
          <Input bordered={false} readOnly></Input>
        </FormItem>
        <FormItem name="gitlabid" label="GitlabID">
          <Input readOnly bordered={false}></Input>
        </FormItem>
        <FormItem
          name="email"
          label={<Typography.Text>邮箱</Typography.Text>}
          rules={[
            {
              type: "email",
              message: "不是有效的邮箱!",
            },
          ]}
        >
          <Input bordered={true}></Input>
        </FormItem>
        <FormItem name="role" label="角色">
          <Radio.Group
            onChange={onCheck || (() => {})}
            disabled={self.role !== 0}
            defaultValue={user.role}
          >
            <Radio.Button value={0}>{"系统管理员"}</Radio.Button>
            <Radio.Button value={1}>{"助教"}</Radio.Button>
            <Radio.Button value={2}>{"学生"}</Radio.Button>
          </Radio.Group>
        </FormItem>
        <FormItem name="gongde" label="功德🙏">
          <Input bordered={false} readOnly></Input>
        </FormItem>
        <FormItem>
          <Row gutter={10}>
            <Col>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Col>
            <Col>
              <Button type="default" onClick={onReset || (() => {})}>
                放弃
              </Button>
            </Col>
          </Row>
        </FormItem>
      </Form>
    </div>
  );
};

export default UserConfig;
