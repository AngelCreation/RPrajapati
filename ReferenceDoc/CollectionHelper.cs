using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.ComponentModel;

namespace ThermochemDBOperation
{
    /// <summary>
    /// It contains a ConvertTo method that returns a DataTable from IList
    /// It contains a CreateTable method that returns a DataTable from ClassName
    /// </summary>
    public class CollectionHelper
    {
        private CollectionHelper()
        {
        }

        public static ArrayList ConvertDataTableToArrayList(DataTable dtTable)
        {
            ArrayList resultArrayList = null;

            if (dtTable != null)
            {
                resultArrayList = new ArrayList();
                for (int i = 0; i <= dtTable.Rows.Count - 1; i++)
                {
                    ArrayList currRow = new ArrayList();
                    for (int j = 0; j <= dtTable.Columns.Count - 1; j++)
                    {
                        currRow.Add(dtTable.Rows[i][j]);
                    }
                    resultArrayList.Add(currRow);
                }
            }
            return resultArrayList;
        }

        /// <summary>
        /// This method is used to cast any datatable into arraylist which contains items of specific DataType.
        /// </summary>
        /// <typeparam name="T">It can be any type which want to be in return arraylist</typeparam>
        /// <param name="dataTable">Datatable which will be casted into arraylist.</param>
        /// <returns>returns arrylist which is generrate by using given Datatable and Type.</returns>
        public static List<T> DataTableToList<T>(DataTable dataTable) where T : new()
        {
            List<T> list = null;
            if (dataTable != null)
            {
                list = new List<T>();
                for (int i = 0; i < dataTable.Rows.Count; i++)
                {
                    DataRow row = dataTable.Rows[i];
                    T item = CreateItemFromRow<T>(row);
                    list.Add(item);
                }
            }

            return list;
        }

        public static T DataTableToBusinessObject<T>(DataTable dataTable) where T : new()
        {
            T obj = default(T);
            if (dataTable != null)
            {
                for (int i = 0; i < dataTable.Rows.Count; i++)
                {
                    DataRow row = dataTable.Rows[i];
                    obj = CreateItemFromRow<T>(row);
                }
            }
            return obj;
        }

        /// <summary>
        /// This method is used to convert Datarow to given Type.
        /// </summary>
        /// <typeparam name="T">It can be any type to specify that new create item should be in given type.</typeparam>
        /// <param name="row">DataRow as parameter for casted in to given Type. </param>
        /// <returns>returns item which is casted from Datarow to given Type.</returns>
        private static T CreateItem<T>(DataRow row)
        {
            T obj = default(T);
            if (row != null)
            {
                obj = Activator.CreateInstance<T>();
                foreach (DataColumn column in row.Table.Columns)
                {
                    PropertyInfo prop = obj.GetType().GetProperty(column.ColumnName);
                    try
                    {
                        if (prop != null)
                        {
                            object value = row[column.ColumnName];
                            if (value != null)
                            {
                                value = value.ToString().Trim();
                                if ((value.GetType() != typeof(DBNull)) && (Convert.ToString(value) != string.Empty))
                                {

                                    if (prop.PropertyType == typeof(Nullable<Int32>))
                                    {
                                        prop.SetValue(obj, Convert.ToInt32(value), null);
                                    }
                                    else if (prop.PropertyType == typeof(Int32))
                                    {
                                        prop.SetValue(obj, Convert.ToInt32(Math.Round(Convert.ToDecimal(value))), null);
                                    }
                                    else if (prop.PropertyType == typeof(Nullable<DateTime>))
                                    {
                                        value = Convert.ToDateTime(row[column.ColumnName]).ToString("MM/dd/yyyy HH:mm:ss.fff", System.Globalization.CultureInfo.InvariantCulture);
                                        prop.SetValue(obj, DateTime.ParseExact(value.ToString(), "MM/dd/yyyy HH:mm:ss.fff", System.Globalization.CultureInfo.InvariantCulture), null);
                                    }
                                    else if (prop.PropertyType == typeof(DateTime))
                                    {
                                        value = Convert.ToDateTime(row[column.ColumnName]).ToString("MM/dd/yyyy HH:mm:ss.fff", System.Globalization.CultureInfo.InvariantCulture);
                                        prop.SetValue(obj, DateTime.ParseExact(value.ToString(), "MM/dd/yyyy HH:mm:ss.fff", System.Globalization.CultureInfo.InvariantCulture), null);
                                    }
                                    else if (prop.PropertyType == typeof(Nullable<char>))
                                    {
                                        prop.SetValue(obj, Convert.ToChar(value), null);
                                    }
                                    else if (prop.PropertyType == typeof(Boolean))
                                    {
                                        int result = 0;
                                        if (int.TryParse(Convert.ToString(value), out result))
                                        {
                                            value = int.Parse(Convert.ToString(value));
                                        }

                                        prop.SetValue(obj, Convert.ToBoolean(value), null);
                                    }
                                    else if (prop.PropertyType == typeof(Nullable<Boolean>))
                                    {
                                        int result = 0;
                                        if (int.TryParse(Convert.ToString(value), out result))
                                        {
                                            value = int.Parse(Convert.ToString(value));
                                        }

                                        prop.SetValue(obj, Convert.ToBoolean(value), null);
                                    }
                                    else
                                    {
                                        prop.SetValue(obj, Convert.ChangeType(value, prop.PropertyType), null);
                                    }
                                }
                                else
                                {
                                    prop.SetValue(obj, null, null);
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        throw ex;
                    }
                }
            }

            return obj;
        }

        public static List<T> ConvertToList<T>(ArrayList list)
        {
            List<T> ret = new List<T>();
            if (list != null)
            {
                foreach (T item in list)
                {
                    ret.Add(item);
                }
            }
            return ret;
        }

        public static List<T> ConvertToList<T>(IList list)
        {
            List<T> ret = new List<T>();
            if (list != null)
            {
                foreach (T item in list)
                {
                    ret.Add(item);
                }
            }
            return ret;
        }

        public static T CreateItemFromRow<T>(DataRow row) where T : new()
        {
            T obj = new T();
            for (int i = 0; i < row.Table.Columns.Count; i++)
            {
                DataColumn column = row.Table.Columns[i];
                PropertyDescriptorCollection props = TypeDescriptor.GetProperties(obj);
                try
                {
                    if (props[column.ColumnName] != null)
                    {
                        object value = row[column.ColumnName];
                        if (value != null)
                        {
                            value = value.ToString().Trim();
                            if (value.GetType() != typeof(DBNull) && Convert.ToString(value) != string.Empty)
                            {
                                if (props[column.ColumnName].PropertyType == typeof(Nullable<Int32>))
                                {
                                    props[column.ColumnName].SetValue(obj, Convert.ToInt32(value));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(Int32))
                                {
                                    props[column.ColumnName].SetValue(obj, Convert.ToInt32(Math.Round(Convert.ToDecimal(value))));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(Nullable<Int64>))
                                {
                                    props[column.ColumnName].SetValue(obj, Convert.ToInt64(value));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(Int64))
                                {
                                    props[column.ColumnName].SetValue(obj, Convert.ToInt64(Math.Round(Convert.ToDecimal(value))));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(Nullable<DateTime>))
                                {
                                    value = Convert.ToDateTime(row[column.ColumnName]).ToString("MM/dd/yyyy HH:mm:ss.fff", System.Globalization.CultureInfo.InvariantCulture);
                                    props[column.ColumnName].SetValue(obj, DateTime.ParseExact(value.ToString(), "MM/dd/yyyy HH:mm:ss.fff", System.Globalization.CultureInfo.InvariantCulture));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(DateTime))
                                {
                                    value = Convert.ToDateTime(row[column.ColumnName]).ToString("MM/dd/yyyy HH:mm:ss.fff", System.Globalization.CultureInfo.InvariantCulture);
                                    props[column.ColumnName].SetValue(obj, DateTime.ParseExact(value.ToString(), "MM/dd/yyyy HH:mm:ss.fff", System.Globalization.CultureInfo.InvariantCulture));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(Nullable<char>))
                                {
                                    props[column.ColumnName].SetValue(obj, Convert.ToChar(value));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(Boolean))
                                {
                                    int result = 0;
                                    if (int.TryParse(Convert.ToString(value), out result))
                                        value = int.Parse(Convert.ToString(value));
                                    props[column.ColumnName].SetValue(obj, Convert.ToBoolean(value));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(Nullable<Boolean>))
                                {
                                    int result = 0;
                                    if (int.TryParse(Convert.ToString(value), out result))
                                        value = int.Parse(Convert.ToString(value));
                                    props[column.ColumnName].SetValue(obj, Convert.ToBoolean(value));
                                }
                                else if (props[column.ColumnName].PropertyType == typeof(Nullable<TimeSpan>))
                                {
                                    TimeSpan time = TimeSpan.Parse(Convert.ToString(value));
                                    props[column.ColumnName].SetValue(obj, time);
                                }
                                else
                                    props[column.ColumnName].SetValue(obj, Convert.ChangeType(value, props[column.ColumnName].PropertyType));
                            }
                            else
                                props[column.ColumnName].SetValue(obj, null);
                        }
                    }
                }
                catch (Exception ex)
                {
                    throw ex;
                }
            }
            return obj;
        }
    }
}
