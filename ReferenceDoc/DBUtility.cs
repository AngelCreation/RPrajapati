using ThermochemCommonBO;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Xml;
using System.Web.Hosting;

namespace ThermochemDBOperation
{
    public class DBUtility
    {
        private static string connStr = string.Empty;

        private static bool isPortalDB = false;

        public DBUtility(bool isPortDBValue=false)
        {
            isPortalDB = isPortDBValue;
        }

        public SqlConnection getDBConnection()
        {
            if (string.IsNullOrEmpty(connStr))
            {
                connStr = GetConnectionString();
            }
            SqlConnection con = new SqlConnection(connStr);
            return con;
        }

        public string GetConnectionString()
        {
            string connStr = string.Empty;
            string directorypath = "XMLSetting";
            string xmlpath = string.Empty;
            DirectoryInfo objdirectory = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
            DirectoryInfo objpath = objdirectory.Root;
            directorypath = objpath.Name + directorypath;
            if (isPortalDB)
            {
                xmlpath = directorypath + "\\DbConnectionPortal.xml";
            }
            else
            {
                xmlpath = directorypath + "\\DbConnection.xml";
            }

            if (HostingEnvironment.IsHosted == true)
            {
                xmlpath = HostingEnvironment.MapPath("~");
                int lastindex = xmlpath.LastIndexOf('\\');
                xmlpath = xmlpath.Substring(0, lastindex);
                string direcPath = xmlpath + "\\" + "XMLSetting";
                // xmlpath = direcPath + "\\DbConnection.xml";

                if (isPortalDB)
                {
                    xmlpath = direcPath + "\\DbConnectionPortal.xml";
                }
                else
                {
                    xmlpath = direcPath + "\\DbConnection.xml";
                }
            }

            XmlDocument myXmlDocument = new XmlDocument();
            myXmlDocument.Load(xmlpath);
            XmlNode xmlnode = myXmlDocument.SelectSingleNode("/xml/conectionstring");

            if (xmlnode != null)
            {
                connStr = xmlnode.InnerText + "Persist Security Info=True;";
            }

            List<string> LstconnStr = connStr.Split(';').ToList();
            string Pwd = Cryptography.Decrypt(LstconnStr[3].Replace("password =", string.Empty));
            string UserName = Cryptography.Decrypt(LstconnStr[2].Replace("User Id =", string.Empty));
            LstconnStr.RemoveAt(3);
            LstconnStr.RemoveAt(2);
            connStr = string.Join(";", LstconnStr.ToArray());
            connStr = connStr + "User Id =" + UserName + ";password =" + Pwd;
            return connStr;
        }

        public DataTable ReturnDataTable(string procedureName, List<SqlParameter> parameters = null)
        {
            DataTable dtData = new DataTable();
            using (SqlConnection con = getDBConnection())
            {
                try
                {
                    //SqlConnection con= g
                    if (con.State != ConnectionState.Open)
                    {
                        con.Open();
                    }
                    using (SqlCommand sqlCommand = new SqlCommand(procedureName, con))
                    {
                        sqlCommand.CommandType = CommandType.StoredProcedure;
                        if (parameters != null)
                        {
                            sqlCommand.Parameters.AddRange(parameters.ToArray());
                        }
                        using (SqlDataAdapter sqlDataAdapter = new SqlDataAdapter(sqlCommand))
                        {
                            sqlDataAdapter.Fill(dtData);
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogMessages.PrintException(ex);
                    throw ex;
                }

                finally
                {
                    if (con.State != ConnectionState.Closed)
                        con.Close();
                }
            }
            return dtData;
        }

        public DataSet ReturnDataSet(string procedureName, List<SqlParameter> parameters = null)
        {
            DataSet dsData = new DataSet();
            using (SqlConnection con = getDBConnection())
            {
                try
                {
                    if (con.State != ConnectionState.Open)
                    {
                        con.Open();
                    }

                    using (SqlCommand sqlCommand = new SqlCommand(procedureName, con))
                    {
                        sqlCommand.CommandType = CommandType.StoredProcedure;
                        if (parameters != null)
                            sqlCommand.Parameters.AddRange(parameters.ToArray());
                        using (SqlDataAdapter sqlDataAdapter = new SqlDataAdapter(sqlCommand))
                        {
                            sqlDataAdapter.Fill(dsData);
                        }
                    }
                }
                catch (Exception ex)
                {
                    LogMessages.PrintException(ex);
                    throw ex;
                }

                finally
                {
                    if (con.State != ConnectionState.Closed)
                        con.Close();
                }
            }

            return dsData;
        }

        public void ExecureNonQuery(string procedureName, List<SqlParameter> parameters, out FaultContract fault, int? timeOut = null)
        {
            fault = null;
            using (SqlConnection con = getDBConnection())
            {

                using (SqlCommand sqlCommand = new SqlCommand(procedureName, con))
                {
                    sqlCommand.CommandType = CommandType.StoredProcedure;
                    if (timeOut != null)
                    {
                        sqlCommand.CommandTimeout = Convert.ToInt32(timeOut);
                    }
                    if (parameters != null)
                        sqlCommand.Parameters.AddRange(parameters.ToArray());
                    if (con.State != ConnectionState.Open)
                        con.Open();
                    try
                    {
                        sqlCommand.ExecuteNonQuery();
                    }
                    catch (Exception ex)
                    {
                        LogMessages.PrintException(ex);
                        fault = new FaultContract()
                        {
                            FaultType = ex.Message,
                            Message = ex.Message
                        };
                    }
                    finally
                    {
                        if (con.State != ConnectionState.Closed)
                            con.Close();
                    }
                }
            }
        }

        public T ExecuteScaler<T>(string procedureName, List<SqlParameter> parameters, out FaultContract fault)
        {
            T result = default(T);
            fault = null;
            using (SqlConnection con = getDBConnection())
            {

                using (SqlCommand sqlCommand = new SqlCommand(procedureName, con))
                {
                    sqlCommand.CommandType = CommandType.StoredProcedure;
                    if (parameters != null)
                        sqlCommand.Parameters.AddRange(parameters.ToArray());
                    if (con.State != ConnectionState.Open)
                        con.Open();
                    try
                    {
                        result = (T)sqlCommand.ExecuteScalar();
                    }
                    catch (Exception ex)
                    {
                        LogMessages.PrintException(ex);
                        fault = new FaultContract()
                        {
                            FaultType = ex.Message,
                            Message = ex.Message
                        };
                    }
                    finally
                    {
                        if (con.State != ConnectionState.Closed)
                            con.Close();
                    }
                }
            }

            return result;
        }

        public void BulkInsertUpdate(string procedureName, string paramName, DataTable dt)
        {
            using (SqlConnection con = getDBConnection())
            {
                using (SqlCommand sqlCommand = new SqlCommand(procedureName, con))
                {
                    sqlCommand.CommandType = CommandType.StoredProcedure;
                    sqlCommand.Parameters.AddWithValue("@" + paramName, dt);
                    if (con.State != ConnectionState.Open)
                        con.Open();
                    sqlCommand.ExecuteNonQuery();
                }
            }
            
        }
    }
}
