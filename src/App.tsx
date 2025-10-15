import { useState} from "react";
import DOMPurify from "dompurify";
import {
  Layout,
  Card,
  List,
  Modal,
  Button,
  Pagination,
  Badge,
  Space,
  Divider,
  Typography,

  ConfigProvider,
  Tooltip,
  Alert,
  Input,
  Skeleton,
} from "antd";
import {
  MailOutlined,
  SyncOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text, Paragraph } = Typography;

// API Configuration
const API_BASE_URL = "https://temp-mail.brosupdigital.com";
// const API_BASE_URL = "http://127.0.0.1:8000";


function checkAndClearSessionCookie() {
  // console.log("Checking PHPSESSID cookie...");
  const sessionId = document.cookie
          .split('; ')
          .find(row => row.startsWith('PHPSESSID='))
          ?.split('=')[1];

  const lastSession = localStorage.getItem("lastSessionId");
  const lastUpdate = localStorage.getItem("lastSessionUpdate");

  const now = Date.now();

  if (sessionId) {
    if (sessionId !== lastSession) {
      // Nếu cookie đổi, cập nhật
      localStorage.setItem("lastSessionId", sessionId);
      localStorage.setItem("lastSessionUpdate", now.toString());
    } else if (lastUpdate && now - Number(lastUpdate) > 60 * 60 * 1000) {
      // Nếu cookie không đổi quá 1 giờ => xóa
      document.cookie = "PHPSESSID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("lastSessionId");
      localStorage.removeItem("lastSessionUpdate");
      // console.log("PHPSESSID cookie cleared after 60 minutes of inactivity.");
    }
  }
}


function App() {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mails, setMails] = useState<any[]>([]);
  const [selectedMail, setSelectedMail] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checkingStatus, setCheckingStatus] = useState("");
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info', message: string } | null>(null);
  // const [isDark, setIsDark] = useState(getThemeMode());

  // Theme effect
  // useEffect(() => {
  //   saveThemeMode(isDark);
  // }, [isDark]);



  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotificationMessage({ type, message });
    // Auto hide after 4 seconds
    setTimeout(() => {
      setNotificationMessage(null);
    }, 4000);
  };

  // const toggleTheme = () => {
  //   setIsDark(!isDark);
  // };


  const ALLOWED_DOMAINS = [
    'nguyenmail.pro', 
    'lurvon.com', 
    'juboro.com', 
    'brosup.dev',
    "sharklasers.com",
    "guerrillamail.info",
    "grr.la",
    "guerrillamail.biz",
    "guerrillamail.com",
    "guerrillamail.de",
    "guerrillamail.net",
    "guerrillamail.org",
    "guerrillamailblock.com",
    "pokemail.net",
    "spam4.me"
  ];
  // Kiểm tra và xóa cookie PHPSESSID nếu cần mỗi 5 phút
  setInterval(checkAndClearSessionCookie, 5 * 60 * 1000);

  const validateEmail = (email: string): { isValid: boolean; message: string } => {

    if (!email.trim()) {
      return { isValid: false, message: "Please enter an email address" };
    }

  
    if (!email.includes('@')) {
      return { isValid: false, message: "Email must contain @ symbol" };
    }

    const parts = email.split('@');
    if (parts.length !== 2) {
      return { isValid: false, message: "Invalid email format" };
    }

    const [username, domain] = parts;
    
   
    if (!username.trim()) {
      return { isValid: false, message: "Username cannot be empty" };
    }

   
    if (!domain.trim()) {
      return { isValid: false, message: "Domain cannot be empty" };
    }
    
    // Check if domain is allowed
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return { 
        isValid: false, 
        message: `Invalid domain.` 
      };
    }

    return { isValid: true, message: "" };
  };

  const handleUserSubmit = async () => {
    if (!userInput.trim()) {
      showNotification("error", "Please enter an email address");
      return;
    }

    // Validate email format and domain
    const validation = validateEmail(userInput);
    if (!validation.isValid) {
      showNotification("error", validation.message);
      return;
    }

    setLoading(true);
    setCheckingStatus("Checking user status...");

    try {
      await fetchEmails(userInput);
    } catch (error) {
      console.error("Error in handleUserSubmit:", error);
      showNotification("error", "Network error. Please try again.");
    } finally {
      setLoading(false);
      setCheckingStatus("");
    }
  };

const openMail = async (mail: any, uid: any) => {
  setSelectedMail(mail);
  setIsModalOpen(true);

  if (!["@nguyenmail.pro", "@brosup.dev", "@juboro.com", "@lurvon.com"].includes(userInput.slice(userInput.indexOf('@'))) 
      && uid !== null && uid !== undefined) {
    try {
      // lay cookies PHPSESSID
      const phpsessid = document.cookie
        .split('; ')
        .find(row => row.startsWith('PHPSESSID='))
        ?.split('=')[1];
      if (phpsessid === undefined) {
        const response = await axios.post(`${API_BASE_URL}/create-guerrilla`, {
          f: "set_email_user",
          email_user: userInput,
          lang: "en",
          ip: "127.0.0.1",
          agent: "Mozilla"
        });
        if (response.data.session_id) {
          document.cookie = `PHPSESSID=${response.data.session_id}; path=/`;
        }
      }
      const res = await axios.get(`${API_BASE_URL}/read-guerrilla-email/${uid}?session_id=${phpsessid}`);
      const data = res.data;

      // Cập nhật body của mail đã chọn
      setSelectedMail((prev: any) => ({
      ...prev!,
      body: data.body
    }));

    } catch (error) {
      console.error("Lỗi khi đọc email:", error);
    }
  }
};

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setSelectedMail(null);
  };



  const handleRefresh = async () => {
    if (!userInput.trim()) return;
    setRefreshing(true);
    try {
      await fetchEmails(userInput);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await fetchEmails(userInput);
  };

  const fetchEmails = async (user: string) => {
    try {
      let response;
      if (["@nguyenmail.pro", "@lurvon.com", "@juboro.com", "@brosup.dev"].includes(user.slice(user.indexOf('@')))) {
        response = await axios.get(`${API_BASE_URL}/read-email`, {
          params: { user },
        });
      }else {
        // lay userinput tu cookies
        const userFromCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('user='))
          ?.split('=')[1];
        if (userFromCookie) {
          user = decodeURIComponent(userFromCookie);
        }

        if (userFromCookie !== encodeURIComponent(user)) {
          // console.log("User has changed. Creating new session...");
          document.cookie = `user=${encodeURIComponent(user)}; path=/`;
                // Gọi API tạo hoặc lấy session_id

          response = await axios.post(`${API_BASE_URL}/create-guerrilla`, {
          f: "set_email_user",
          email_user: user,
          lang: "en",
          ip: "127.0.0.1",
          agent: "Mozilla"
        });
        if (response.data.session_id) {
          document.cookie = `PHPSESSID=${response.data.session_id}; path=/`;
        }
        }

       const phpsessid = document.cookie
          .split('; ')
          .find(row => row.startsWith('PHPSESSID='))
          ?.split('=')[1];
        // console.log('Using PHPSESSID:', phpsessid);
        response = await axios.get(`${API_BASE_URL}/get-guerrilla-emails?session_id=${phpsessid}&page=1&limit=8`);
      }

      if (response.data.emails && Array.isArray(response.data.emails)) {
        setMails(response.data.emails);
        setTotalPages(1);
        setUnreadCount(
          response.data.emails.filter((mail: any) => !mail.read).length
        );
        showNotification("success", `Loaded ${response.data.emails.length} emails`);
      } else {
        setMails([]);
        setTotalPages(1);
        setUnreadCount(0);
        showNotification("info", "No emails found");
      }
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      
      // Check if it's a 500 error
      if (error.response && error.response.status === 500) {
        showNotification("error", "Email address not found or invalid");
        setMails([]);
        setUnreadCount(0);
      } else {
        showNotification("error", "Failed to fetch emails");
      }
    }
  };



  const isHTML = (str: string) => {
    const htmlRegex = /<[a-z][\s\S]*>/i;
    return htmlRegex.test(str);
  };

  const extractCodes = (mail: any): string => {
    const codePatterns = /\b\d{6}\b|\b\d{8}\b/g

    // First check subject
    if (mail.subject) {
      const matches = mail.subject.match(codePatterns);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }

    // If no codes in subject, check body
    if (mail.body) {
        const cleanText = mail.body.replace(/<[^>]*>/g, '');
        const matches = cleanText.match(codePatterns);
        if (matches && matches.length > 0) {
          return matches[0];
        }
    }

    return "";
  };

  const handleCopyCode = async (mail: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const code = extractCodes(mail);
    if (code) {
      await navigator.clipboard.writeText(code);
      showNotification("success", "Code copied to clipboard!");
    } else {
      showNotification("info", "No code found in this email");
    }
  };

  return (
    <ConfigProvider
      theme={{
        // algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#ef4444",
          borderRadius: 8,
        },
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
      
      <Layout style={{ minHeight: "100vh" }}>

        {/* Main Content */}
        <div
          style={{
            // background: isDark ? "#f5f5f5" : "#f8f9fa",
            minHeight: "calc(100vh - 100px)",
            padding: "40px 20px",
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
                {/* Email Input Card */}
                <Card
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                    border: "none",
                    marginBottom: "30px",
                  }}
                >

                  <div style={{ maxWidth: "500px", margin: "0 auto" }}>
                    <Space.Compact style={{ width: "100%" }}>
                                              <Input
                          size="large"
                          placeholder="Enter email"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onPressEnter={handleUserSubmit}
                          status={userInput && !validateEmail(userInput).isValid ? "error" : undefined}
                          style={{
                            borderRadius: "12px 0 0 12px",
                            border: "2px solid #e1e5e9",
                            fontSize: "16px",
                            height: "50px",
                          }}
                        />
                      <Button
                        type="primary"
                        size="large"
                        onClick={handleUserSubmit}
                        loading={loading}
                        disabled={loading || !validateEmail(userInput).isValid}
                        style={{
                          borderRadius: "0 12px 12px 0",
                          background: !validateEmail(userInput).isValid
                            ? "#d9d9d9" 
                            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          border: "none",
                          height: "50px",
                          fontSize: "16px",
                          fontWeight: "bold",
                          minWidth: "120px",
                        }}
                      >
                        {loading ? "Loading..." : "Read Mail"}
                      </Button>
                                          </Space.Compact>
                    </div>
                </Card>

                {checkingStatus && (
                  <Alert
                    message={checkingStatus}
                    type="info"
                    showIcon
                    style={{ marginBottom: "20px", borderRadius: "12px" }}
                  />
                )}

                {notificationMessage && (
                  <div
                    style={{
                      position: "fixed",
                      top: "20px",
                      right: "20px",
                      zIndex: 1000,
                      maxWidth: "400px",
                      animation: "slideIn 0.3s ease"
                    }}
                  >
                    <Alert
                      message={notificationMessage.message}
                      type={notificationMessage.type}
                      showIcon
                      closable
                      onClose={() => setNotificationMessage(null)}
                      style={{ 
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                      }}
                    />
                  </div>
                )}

                {/* Mail List */}
                {mails.length > 0 && (
                  <Card
                    style={{
                      background: "white",
                      borderRadius: "16px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                      border: "none",
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: "20px"
                    }}>
                      <Title level={3} style={{ margin: 0, color: "#333" }}>
                        📬
                        {unreadCount > 0 && (
                          <Badge
                            count={unreadCount}
                            style={{ 
                              backgroundColor: "#667eea",
                              marginLeft: "10px"
                            }}
                          />
                        )}
                      </Title>
                      <Tooltip title="Refresh">
                        <Button
                          icon={<SyncOutlined spin={refreshing} />}
                          onClick={handleRefresh}
                          disabled={refreshing}
                          style={{ color: "#667eea" }}
                        />
                      </Tooltip>
                    </div>

                    <List
                      dataSource={mails}
                      renderItem={(mail) => (
                        <List.Item
                          className={`mail-item ${!mail.read ? "unread" : ""}`}
                          onClick={() => openMail(mail, mail.uid)}
                          style={{
                            padding: "16px",
                            borderRadius: "12px",
                            cursor: "pointer",
                            border: "1px solid #f0f0f0",
                            marginBottom: "8px",
                            transition: "all 0.3s ease",
                          }}
                        >
                          <div style={{ width: "100%" }}>
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: "8px"
                            }}>
                              <div style={{ flex: 1 }}>
                                <Text strong style={{ fontSize: "16px", color: "#333" }}>
                                  {mail.subject || "No Subject"}
                                </Text>
                                <div style={{ marginTop: "4px" }}>
                                  <Text style={{ color: "#666", fontSize: "14px" }}>
                                    From: {mail.from_name} &lt;{mail.from_email}&gt;
                                  </Text>
                                </div>
                              </div>
                              <Space direction="vertical" size="small" style={{ alignItems: "flex-end" }}>
                                <Text style={{ color: "#999", fontSize: "12px" }}>
                                  {mail.date
                                    ? new Date(mail.date).toLocaleString("vi-VN", {
                                        hour12: false,
                                      })
                                    : ""}
                                </Text>
                                {extractCodes(mail) && (
                                    <Tooltip title="Copy code">
                                      <Button
                                        type="text"
                                        icon={<SafetyCertificateOutlined />}
                                        onClick={(e) => handleCopyCode(mail, e)}
                                        style={{ 
                                          color: "#667eea",
                                          fontSize: "12px"
                                        }}
                                      >
                                        Code
                                      </Button>
                                    </Tooltip>
                                  )}
                              </Space>
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />

                    {totalPages > 1 && (
                      <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <Pagination
                          current={currentPage}
                          total={totalPages * 10}
                          pageSize={10}
                          onChange={handlePageChange}
                          showSizeChanger={false}
                          showQuickJumper
                          showTotal={(total, range) =>
                            `${range[0]}-${range[1]} of ${total} items`
                          }
                        />
                      </div>
                    )}
                  </Card>
                )}


        </div>


        {/* Mail Detail Modal */}
        <Modal
          title={
            <Space>
              <MailOutlined style={{ color: "#667eea" }} />
              <span>Email Details</span>
            </Space>
          }
          open={isModalOpen}
          onCancel={handleModalCancel}
          width="90%"
          style={{ maxWidth: 800 }}
          footer={[
            <Button key="close" onClick={handleModalCancel}>
              Close
            </Button>,
          ]}
          destroyOnClose
        >
          {selectedMail && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div>
                    <Text strong>From:</Text>
                    <Text style={{ marginLeft: "8px" }}>
                      {selectedMail.from_name} &lt;{selectedMail.from_email}&gt;
                    </Text>
                  </div>
                  <div>
                    <Text strong>Subject:</Text>
                    <Text style={{ marginLeft: "8px" }}>
                      {selectedMail.subject}
                    </Text>
                  </div>
      <div>
                    <Text strong>Date:</Text>
                    <Text style={{ marginLeft: "8px" }}>
                      {selectedMail.parsed_date
                        ? new Date(selectedMail.parsed_date).toLocaleString("vi-VN", {
                            hour12: false,
                          })
                        : ""}
                    </Text>
                  </div>
                </Space>
              </div>
              <Divider />
              {isHTML(selectedMail.body) ? (
                <div
                  style={{ fontSize: "14px" }}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(selectedMail.body || ""),
                  }}
                />
              ) : (
                <Paragraph style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>
                  {selectedMail.body !== null ? (
                    selectedMail.body
                  ):(
                     <Skeleton active paragraph={{ rows: 5}} />
                  )}
                </Paragraph>
              )}
      </div>
          )}
        </Modal>
      </div>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
