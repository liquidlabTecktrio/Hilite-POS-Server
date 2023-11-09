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

function getFormatedNameForRows(name) {

    let rowNames = ["Vehicle Count", "Entry Count", "Exit Count", "FOC upto 10 min Count", "Revenue Collection Cash", "Revenue Collection UPI",
        "MTD Vehicle Count", "MTD Entry Count", "MTD Exit Count", "MTD FOC upto 10 min Count", "MTD Revenue Collection Cash", "MTD Revenue Collection UPI",
        "Lost Ticket Count", "Lost Ticket Revenue Collection Cash", "Lost Ticket Revenue Collection UPI",
        "MTD Lost Ticket Count", "MTD Lost Ticket Revenue Collection Cash", "MTD Lost Ticket Revenue Collection UPI",
        "Over Night Vehicle Count", "Over Night Revenue Collection Cash", "Over Night Revenue Collection UPI",
        "MTD Over Night Vehicle Count", "MTD Over Night Revenue Collection Cash", "MTD Over Night Revenue Collection UPI",

        "Monthly Pass Count", "Monthly Pass Revenue Cash", "Monthly Pass Revenue UPI",
        "MTD Monthly Pass Count", "MTD Monthly Pass Revenue Cash", "MTD Monthly Pass Revenue UPI",]

    let rowNamesV2 = ["Vehicle Count", "Entry Count", "Exit Count", "FOC upto 10 min Count", "Revenue (Cash) - (a)", "Revenue (UPI) - (b)",
        "MTD Vehicle Count", "MTD Entry Count", "MTD Exit Count", "MTD FOC upto 10 min Count", "MTD Revenue (Cash) - (c)", "MTD Revenue (UPI) - (d)",
        "Lost Ticket Count", "Lost Ticket Revenue (Cash)", "Lost Ticket Revenue (UPI)",
        "MTD Lost Ticket Count", "MTD Lost Ticket Revenue (Cash)", "MTD Lost Ticket Revenue (UPI)",
        "Over Night Vehicle Count", "Over Night Revenue (Cash)", "Over Night Revenue (UPI)",
        "MTD Over Night Vehicle Count", "MTD Over Night Revenue (Cash)", "MTD Over Night Revenue (UPI)",

        "Monthly Pass Count", "Monthly Pass Revenue (Cash) - (e)", "Monthly Pass Revenue (UPI) - (f)",
        "MTD Monthly Pass Count", "MTD Monthly Pass Revenue (Cash) - (g)", "MTD Monthly Pass Revenue (UPI) - (h)",]

    return rowNamesV2[rowNames.indexOf(name)]
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

            // let colums = [rowData.name]
            let colums = [getFormatedNameForRows(rowData.name)]

            obj.allParkings.map(p => {
                rowData.parkingsWiseData.filter(pp => pp._id == p._id).map(p => p.vehicleWiseData.map(v => { colums.push(v.value) }))
            })
            worksheet.addRow(colums);
        });


        let totalCashRevenue = obj.dayEndReportData.filter(r => r.name == 'Revenue Collection Cash' || r.name == 'Monthly Pass Revenue Cash').map(p => p.parkingsWiseData.map(p => p.vehicleWiseData.filter(v => v.vehicleType != 'Total').reduce((a, b) => { return a + b.value }, 0)).reduce((a, b) => { return a + b }, 0)).reduce((a, b) => { return a + b }, 0)
        let totalUPIRevenue = obj.dayEndReportData.filter(r => r.name == 'Revenue Collection UPI' || r.name == 'Monthly Pass Revenue UPI').map(p => p.parkingsWiseData.map(p => p.vehicleWiseData.filter(v => v.vehicleType != 'Total').reduce((a, b) => { return a + b.value }, 0)).reduce((a, b) => { return a + b }, 0)).reduce((a, b) => { return a + b }, 0)
        let totalGrossRevenue = totalCashRevenue + totalUPIRevenue
        let totalTax = parseFloat(((totalGrossRevenue * 0.18 / 1.18) / 2 ).toFixed(2))
        // let totalNetRevenue = totalGrossRevenue / 1.18
        let totalNetRevenue = totalGrossRevenue - (totalTax * 2)

        worksheet.addRow();
        worksheet.addRow(['Daily GST']);
        worksheet.addRow(['Total Revenue Cash (a + e)', totalCashRevenue]);
        worksheet.addRow(['Total Revenue UPI (b + f)', totalUPIRevenue]);
        worksheet.addRow(['Total Gross Revenue (a + b + e + f)', parseFloat((totalGrossRevenue).toFixed(2))]);
        // worksheet.addRow(['Total SGST', parseFloat(((totalGrossRevenue - totalNetRevenue) / 2).toFixed(2))]);
        // worksheet.addRow(['Total CGST', parseFloat(((totalGrossRevenue - totalNetRevenue) / 2).toFixed(2))]);
        // worksheet.addRow(['Total Net Revenue', parseFloat((totalNetRevenue).toFixed(2))]);
        worksheet.addRow(['Total SGST', totalTax]);
        worksheet.addRow(['Total CGST', totalTax]);
        worksheet.addRow(['Total Net Revenue', totalNetRevenue]);


        let totalMTDCashRevenue = obj.dayEndReportData.filter(r => r.name == 'MTD Revenue Collection Cash' || r.name == 'MTD Monthly Pass Revenue Cash').map(p => p.parkingsWiseData.map(p => p.vehicleWiseData.filter(v => v.vehicleType != 'Total').reduce((a, b) => { return a + b.value }, 0)).reduce((a, b) => { return a + b }, 0)).reduce((a, b) => { return a + b }, 0)
        let totalMTDUPIRevenue = obj.dayEndReportData.filter(r => r.name == 'MTD Revenue Collection UPI' || r.name == 'MTD Monthly Pass Revenue UPI').map(p => p.parkingsWiseData.map(p => p.vehicleWiseData.filter(v => v.vehicleType != 'Total').reduce((a, b) => { return a + b.value }, 0)).reduce((a, b) => { return a + b }, 0)).reduce((a, b) => { return a + b }, 0)
        let totalMTDGrossRevenue = totalMTDCashRevenue + totalMTDUPIRevenue
        let totalMTDTax = parseFloat(((totalMTDGrossRevenue * 0.18 / 1.18) / 2 ).toFixed(2))
        // let totalMTDNetRevenue = totalMTDGrossRevenue / 1.18
        let totalMTDNetRevenue = totalMTDGrossRevenue - (totalMTDTax * 2)

        worksheet.addRow();
        worksheet.addRow(['MTD GST']);
        worksheet.addRow(['Total Revenue Cash (c + g)', totalMTDCashRevenue]);
        worksheet.addRow(['Total Revenue UPI (d + h)', totalMTDUPIRevenue]);
        worksheet.addRow(['Total Gross Revenue (c + d + g + h)', parseFloat((totalMTDGrossRevenue).toFixed(2))]);
        // worksheet.addRow(['Total SGST',  parseFloat(((totalMTDGrossRevenue - totalMTDNetRevenue) / 2).toFixed(2))]);
        // worksheet.addRow(['Total CGST',  parseFloat(((totalMTDGrossRevenue - totalMTDNetRevenue) / 2).toFixed(2))]);
        // worksheet.addRow(['Total Net Revenue', parseFloat((totalMTDNetRevenue).toFixed(2))]);
        worksheet.addRow(['Total SGST',  totalMTDTax]);
        worksheet.addRow(['Total CGST',  totalMTDTax]);
        worksheet.addRow(['Total Net Revenue', totalMTDNetRevenue]);







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
