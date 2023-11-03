const ExcelJs = require("exceljs");
const fs = require("fs");
const path = require("path");

function numberToColumnNames(n) {
    const columnNames = [];
    while (n > 0) {
        n--;
        const remainder = n % 26;
        columnNames.unshift(String.fromCharCode(65 + remainder)); // 'A' has ASCII code 65 (uppercase)
        n = Math.floor(n / 26);
    }
    return columnNames.join('');
}

function getArrayOfColumnNames(n) {
    const columnArray = [];
    for (let i = 1; i <= n; i++) {
        columnArray.push(numberToColumnNames(i));
    }
    return columnArray;
}

exports.dayEndReportExcelFunc = async (obj) => {
    try {

        const workbook = new ExcelJs.Workbook();
        workbook.creator = 'Designa RRTS';
        workbook.lastModifiedBy = '';
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.lastPrinted = new Date();
        // workbook.data = data;

        workbook.views = [
            {
                x: 0, y: 0, width: 1000, hthird: 2000, firstSheet: 0, activeTab: 1, visibility: 'visible'
            }
        ]

        const worksheet = workbook.addWorksheet('day End report', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });



        // date
        let dateSplit = new Date(obj.date).toString().split(' ')

        worksheet.mergeCells('A1:F1');
        worksheet.getRow(1).alignment = { horizontal: 'center' }
        worksheet.getCell('F1').value = `${dateSplit[0]}, ${dateSplit[1]} ${dateSplit[2]}, ${dateSplit[3]}`;
        worksheet.getCell('A1').font = { bold: true }



        // const insideColumns = getArrayOfColumnNames(data.AllShiftEndingTodayData.length * 3);
        // console.log('data.AllShiftEndingTodayData.length: ', data.AllShiftEndingTodayData.length);
        // console.log('insideColumns: ', insideColumns);

        // let collums = obj.AllShiftEndingTodayData.map((d, index) => { return { "key": "shiftStartTime-" + index } })
        // console.log('collums: ', collums);
        // let data = obj.AllShiftEndingTodayData.map((d, index) => { let key = `shiftStartTime-${index}`; return { key: d.shiftStartTime } })
        // console.log('data: ', data);

        // worksheet.columns = [
        //     // { key: 'accountName' },
        //     ...collums,
        // ]

        // worksheet.addRow(...data)



        worksheet.addRow();

        // Define the columns dynamically based on the keys in the data objects
        // const columns = Object.keys(obj.AllShiftEndingTodayData[0]);
        const columnsKeys = ['shiftNo', 'opretorName', 'shiftStartTime', 'shiftStopTime', 'parkingName',]
        const columnsKeyNames = ['Shift No', 'Opretor Name', 'Start Time', 'Stop Time', 'Parking']
        const columnsNames = ['', 'Shift No', '', 'Opretor Name', '', 'Start Time', '', 'Stop Time', 'Parking']

        // Add headers to the worksheet
        worksheet.addRow(columnsNames);

        // Add data to the worksheet
        obj.AllShiftEndingTodayData.forEach(item => {
            const rowData = columnsNames.map(key => item[columnsKeys[columnsKeyNames.indexOf(key)]]);
            worksheet.addRow(rowData);
        });




        worksheet.addRow();



        // Add data to the worksheet
        console.log(obj.allParkings.map(p => {
            return ('', p.parkingName)
        }));

        worksheet.addRow(obj.allParkings.map(p => {
            return ('', p.parkingName)
        }));






        //save
        // const fileName = `Day-End-Report-${data.date.split("-").reverse().splice(0, 3).join("-")}.xlsx`;
        const fileName = `Day-End-Report.xlsx`;
        // console.log('fileName: ', fileName);
        const PathName = path.join(__dirname, "../Documents/dayEndReport/") + fileName;
        await workbook.xlsx.writeFile(PathName, {
            fontSize: '14'
        });

        return PathName;
    } catch (err) {
        console.log(err);
    }
}
