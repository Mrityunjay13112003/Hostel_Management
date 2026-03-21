const increaseMonth = (dateOfJoining, dueDate) => {

    let date = dateOfJoining.getDate();
    let month = dueDate.getMonth();

    const lastDateOfNextMonth = new Date(
        dueDate.getFullYear(),
        month + 2,
        0
    );

    const resultantDate = new Date(dueDate);
    resultantDate.setDate(Math.min(date, lastDateOfNextMonth.getDate()));
    resultantDate.setMonth(month + 1);

    return resultantDate;
}

const decreaseMonth = (dateOfJoining, dueDate) => {

    let date = dateOfJoining.getDate();
    let month = dueDate.getMonth();

    const lastDateOfPreviousMonth = new Date(
        dueDate.getFullYear(),
        month,
        0
    );

    const resultantDate = new Date(dueDate);
    resultantDate.setDate(Math.min(date, lastDateOfPreviousMonth.getDate()));
    resultantDate.setMonth(month - 1);

    return resultantDate;
}

export {
    increaseMonth,
    decreaseMonth
}