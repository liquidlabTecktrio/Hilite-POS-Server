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

function numberToColumn(number) {
    let result = '';
    while (number > 0) {
        const remainder = (number - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        number = Math.floor((number - 1) / 26);
    }
    return result;
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

        worksheet.getRow(1).alignment = { horizontal: 'center' }
        worksheet.getCell('A1').value = `${dateSplit[0]}, ${dateSplit[1]} ${dateSplit[2]}, ${dateSplit[3]}`;
        worksheet.getCell('A1').font = { bold: true }



        // worksheet.addRow();

        // Define the columns dynamically based on the keys in the data objects
        const columnsKeys = ['shiftNo', 'opretorName', 'shiftStartTime', 'shiftStopTime', 'parkingName',]
        const columnsKeyNames = ['Shift No', 'Opretor Name', 'Start Time', 'Stop Time', 'Parking']
        const columnsNames = ['', 'Shift No', '', 'Opretor Name', '', 'Start Time', '', 'Stop Time', '', 'Parking']

        // Add headers to the worksheet
        const shiftHeaders = worksheet.addRow(columnsNames)
        shiftHeaders.alignment = { horizontal: 'center' };
        shiftHeaders.font = { bold: true }


        // Add data to the worksheet
        obj.AllShiftEndingTodayData.forEach(item => {
            const rowData = columnsNames.map(key => item[columnsKeys[columnsKeyNames.indexOf(key)]]);
            worksheet.addRow(rowData);
        });


        // worksheet.addRow();


        // Add parking names to the worksheet

        const rowData = [''].concat(obj.allParkings.flatMap(p => [p.parkingName, '', '', '']));
        const newRow = worksheet.addRow(rowData);
        newRow.alignment = { horizontal: 'center' }
        newRow.alignment = { horizontal: 'center' }
        newRow.font = { bold: true }


        for (let col = 2; col <= rowData.length; col += 4) {
            worksheet.mergeCells(`${numberToColumn(col)}${newRow.number}:${numberToColumn(col + 3)}${newRow.number}`);
        }

        // based on parking merge cells for date first row
        worksheet.mergeCells(`${numberToColumn(1)}1:${numberToColumn(rowData.length)}1`);



        // Add vehicle type for parkings to the worksheet
        let vehicleTypes = ["2 Wheeler", "4 Wheeler", "Bicycle", "Total"]
        const vehicleHeaders = worksheet.addRow([''].concat(obj.allParkings.flatMap(p => [...vehicleTypes])));

        vehicleHeaders.alignment = { horizontal: 'center' }
        vehicleHeaders.font = { bold: true }

        // Add data to all parking vehicle wise to the worksheet
        obj.dayEndReportData.forEach(rowData => {

            let colums = [rowData.name]
            obj.allParkings.map(p => {
                rowData.parkingsWiseData.filter(pp => pp._id == p._id).map(p => p.vehicleWiseData.map(v => { colums.push(v.value) }))
            })
            worksheet.addRow(colums);
        });





        // Set alignment for all columns 
        worksheet.columns.forEach((col, index) => {
            if (index !== 0) {
                col.alignment = { horizontal: 'center', wrapText: true };
            } else {
                col.alignment = { horizontal: 'start', wrapText: true };
            }
        });



        // Set a light border for all cells in the worksheet
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });


        // Set the column widths based on the calculated values
        const columnWidths = worksheet.columns.map((column) => {
            return column.values.reduce((acc, value) => {
                const cellLength = value ? value.toString().length : 0;
                return cellLength > acc ? cellLength : acc;
            }, 0);
        });

        columnWidths.forEach((width, index) => {
            worksheet.getColumn(index + 1).width = width + 2; // Add some extra padding
        });


        //save
        const fileName = `Day-End-Report-${dateSplit[0]}_${dateSplit[1]} ${dateSplit[2]}_${dateSplit[3]}.xlsx`;
        // const fileName = `Day-End-Report.xlsx`;
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
