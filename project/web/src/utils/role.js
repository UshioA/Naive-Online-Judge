const Role = {
  Admin: 0,
  Staff: 1,
  Student: 2,
  isLower: (a, b) => {
    return a > b;
  },
};

const canWriteUser = (writer, writee) => {
  if (writer.username === writee.username) {
    return true;
  }
  switch (writer.role) {
    case Role.Admin: {
      return true;
    }
    case Role.Staff: {
      return writee.role === Role.Student;
    }
    default:
      return false;
  }
};

Object.freeze(Role);

export { canWriteUser };
export default Role;
