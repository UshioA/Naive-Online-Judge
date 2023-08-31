import dayjs from "dayjs";
import moment from "moment";

const todayjs = (gotime, locale = "zh-cn") => {
  return dayjs(moment(gotime).locale(locale).toDate());
};

export default todayjs;
