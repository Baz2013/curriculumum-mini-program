/**
 * Admin Panel Main Script
 * 管理后台主要脚本
 */

// API基础URL
const API_BASE_URL = 'http://localhost:3000/api';

// 当前激活的部分
let currentSection = 'dashboard';

// 分页状态
let currentPage = 1;
let pageSize = 20;

// Chart instances
let weeklyChart = null;
let categoryChart = null;

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
});

/**
 * 切换不同的功能区
 */
function switchSection(section) {
    currentSection = section;
    currentPage = 1;
    
    // 更新导航高亮
    document.querySelectorAll('.nav-menu li').forEach(li => {
        li.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // 更新标题
    const titles = {
        'dashboard': '数据概览',
        'courses': '课程管理',
        'bookings': '预约记录',
        'users': '用户管理'
    };
    document.getElementById('pageTitle').textContent = titles[section];
    
    // 切换内容区域
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');
    
    // 加载对应数据
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'courses':
            loadCourses();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

/**
 * 加载仪表盘数据
 */
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`);
        const result = await response.json();
        
        if (result.success) {
            const { summary, trends } = result.data;
            
            // 更新统计数字
            animateNumber('totalCourses', summary.totalCourses);
            animateNumber('totalBookings', summary.totalBookings);
            animateNumber('totalUsers', summary.totalUsers);
            animateNumber('todayBookings', summary.todayBookings);
            
            // 渲染图表
            renderWeeklyChart(trends.weekly);
            renderCategoryChart(trends.categories);
        }
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
    }
}

/**
 * 数字动画效果
 */
function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const increment = Math.ceil(targetValue / 20);
    let counter = currentValue;
    
    const timer = setInterval(() => {
        counter += increment;
        if (counter >= targetValue) {
            counter = targetValue;
            clearInterval(timer);
        }
        element.textContent = counter.toLocaleString();
    }, 50);
}

/**
 * 渲染周预约趋势图
 */
function renderWeeklyChart(data) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    const labels = data.map(d => d.date.slice(5)); // MM-DD格式
    const values = data.map(d => d.count);
    
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '预约数量',
                data: values,
                borderColor: '#1890ff',
                backgroundColor: 'rgba(24, 144, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * 渲染分类饼图
 */
function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const colors = ['#1890ff', '#52c41a', '#faad14', '#f759ab', '#722ed1'];
    
    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

/**
 * 加载课程列表
 */
async function loadCourses() {
    try {
        const status = document.getElementById('courseFilter').value;
        const response = await fetch(
            `${API_BASE_URL}/admin/courses?page=${currentPage}&pageSize=${pageSize}&status=${status}`
        );
        const result = await response.json();
        
        if (result.success) {
            renderCourses(result.list);
            renderPagination('coursesPagination', result.pagination, loadCourses);
        }
    } catch (error) {
        console.error('加载课程列表失败:', error);
    }
}

/**
 * 渲染课程表格
 */
function renderCourses(courses) {
    const tbody = document.getElementById('coursesTableBody');
    
    if (courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#999;">暂无数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = courses.map(course => `
        <tr>
            <td>${course.id}</td>
            <td>${escapeHtml(course.title)}</td>
            <td>${escapeHtml(course.category_name || '-')}</td>
            <td>${escapeHtml(course.teacher || '-')}</td>
            <td>${formatDateTime(course.start_time)}</td>
            <td>${course.capacity}</td>
            <td>${course.booked_count}/${course.capacity}</td>
            <td>¥${course.price}</td>
            <td>
                <span class="badge ${course.status === 'published' ? 'success' : 'default'}">
                    ${course.status === 'published' ? '已发布' : '草稿'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editCourse(${course.id})">编辑</button>
                    <button class="btn-delete" onclick="deleteCourse(${course.id})">删除</button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * 加载预约记录
 */
async function loadBookings() {
    try {
        const status = document.getElementById('bookingStatusFilter').value;
        const courseId = document.getElementById('bookingCourseFilter').value;
        
        let url = `${API_BASE_URL}/admin/bookings?page=${currentPage}&pageSize=${pageSize}`;
        if (status) url += `&status=${status}`;
        if (courseId) url += `&courseId=${courseId}`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            renderBookings(result.list);
            renderPagination('bookingsPagination', result.pagination, loadBookings);
        }
    } catch (error) {
        console.error('加载预约记录失败:', error);
    }
}

/**
 * 渲染预约表格
 */
function renderBookings(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    
    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">暂无数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td>${booking.id}</td>
            <td>${escapeHtml(booking.user_nickname)}</td>
            <td>${escapeHtml(booking.user_phone || '-')}</td>
            <td>${escapeHtml(booking.course_title)}</td>
            <td>${formatDateTime(booking.course_start_time)}</td>
            <td>${formatDateTime(booking.created_at)}</td>
            <td>
                <span class="badge ${
                    booking.status === 'confirmed' ? 'success' : 
                    booking.status === 'cancelled' ? 'danger' : 'default'
                }">
                    ${booking.status === 'confirmed' ? '已确认' : 
                      booking.status === 'cancelled' ? '已取消' : booking.status}
                </span>
            </td>
            <td>
                <span class="badge ${
                    booking.check_in_status === 'checked' ? 'success' : 'default'
                }">
                    ${booking.check_in_status === 'checked' ? '已签到' : '未签到'}
                </span>
            </td>
        </tr>
    `).join('');
}

/**
 * 加载用户列表
 */
async function loadUsers() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/users?page=${currentPage}&pageSize=${pageSize}`
        );
        const result = await response.json();
        
        if (result.success) {
            renderUsers(result.list);
            renderPagination('usersPagination', result.pagination, loadUsers);
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

/**
 * 渲染用户表格
 */
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">暂无数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>
                <img src="${user.avatar_url}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/></svg>'">
            </td>
            <td>${escapeHtml(user.nickname)}</td>
            <td>${user.role === 'admin' ? '管理员' : '普通用户'}</td>
            <td>${escapeHtml(user.phone || '-')}</td>
            <td>${escapeHtml(user.email || '-')}</td>
            <td>${user.booking_count || 0}</td>
            <td>${formatDateTime(user.created_at)}</td>
        </tr>
    `).join('');
}

/**
 * 渲染分页控件
 */
function renderPagination(containerId, pagination, loadDataFunction) {
    const container = document.getElementById(containerId);
    const { page, totalPages } = pagination;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = `
        <button ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1}, '${loadDataFunction.name}')">
            ‹ 上一页
        </button>
        <span>第 ${page} / ${totalPages} 页</span>
        <button ${page === totalPages ? 'disabled' : ''} onclick="changePage(${page + 1}, '${loadDataFunction.name}')">
            下一页 ›
        </button>
    `;
    
    container.innerHTML = html;
}

/**
 * 改变页码
 */
function changePage(newPage, functionName) {
    currentPage = newPage;
    window[functionName]();
}

/**
 * 显示新增课程模态框
 */
function showAddCourseModal() {
    showModal('新增课程', `
        <form id="addCourseForm" onsubmit="saveNewCourse(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>课程名称 *</label>
                    <input type="text" class="form-control" name="title" required>
                </div>
                <div class="form-group">
                    <label>所属分类</label>
                    <select class="form-control" name="categoryId">
                        <option value="">请选择</option>
                        <option value="1">编程技术</option>
                        <option value="2">设计创意</option>
                        <option value="3">语言学习</option>
                        <option value="4">职业技能</option>
                        <option value="5">兴趣爱好</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>讲师姓名</label>
                    <input type="text" class="form-control" name="teacher">
                </div>
                <div class="form-group">
                    <label>授课地点</label>
                    <input type="text" class="form-control" name="location">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>开始时间 *</label>
                    <input type="datetime-local" class="form-control" name="startTime" required>
                </div>
                <div class="form-group">
                    <label>结束时间 *</label>
                    <input type="datetime-local" class="form-control" name="endTime" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>容纳人数</label>
                    <input type="number" class="form-control" name="capacity" value="50" min="1">
                </div>
                <div class="form-group">
                    <label>课程价格</label>
                    <input type="number" class="form-control" name="price" value="0" min="0" step="0.01">
                </div>
            </div>
            <div class="form-group">
                <label>课程描述</label>
                <textarea class="form-control" name="description" rows="4"></textarea>
            </div>
            <div class="form-group">
                <label>封面图片URL</label>
                <input type="url" class="form-control" name="image">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" onclick="closeModalDirectly()">取消</button>
                <button type="submit" class="btn-submit">保存</button>
            </div>
        </form>
    `);
}

/**
 * 保存新课程
 */
async function saveNewCourse(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const rawData = Object.fromEntries(formData.entries());
    
    // 转换时间格式：从 YYYY-MM-DDTHH:mm 到 YYYY-MM-DD HH:mm:ss
    const convertTimeFormat = (timeStr) => {
        if (!timeStr) return '';
        return timeStr.replace('T', ' ') + ':00';
    };
    
    // 构造符合后端预期的数据格式
    const data = {
        title: rawData.title?.trim(),
        description: rawData.description?.trim() || '',
        categoryId: rawData.categoryId ? parseInt(rawData.categoryId) : null,
        teacher: rawData.teacher?.trim() || '',
        location: rawData.location?.trim() || '',
        startTime: convertTimeFormat(rawData.startTime),
        endTime: convertTimeFormat(rawData.endTime),
        capacity: rawData.capacity ? parseInt(rawData.capacity) : 50,
        price: rawData.price ? parseFloat(rawData.price) : 0,
        image: rawData.image?.trim() || ''
    };
    
    // 打印发送的数据便于调试
    console.log('Submitting course data:', data);
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        console.log('Response:', result);
        
        if (response.ok && result.success) {
            alert('课程创建成功！');
            closeModalDirectly();
            loadCourses();
        } else {
            // 显示更详细的错误信息
            const errorMsg = result.message || '未知错误';
            console.error('Save course failed:', errorMsg);
            alert('创建失败: ' + errorMsg);
        }
    } catch (error) {
        console.error('Network error saving course:', error);
        alert('网络请求失败，请检查网络连接后重试');
    }
}

/**
 * 编辑课程
 */
function editCourse(courseId) {
    alert('编辑功能将在下个版本推出');
}

/**
 * 删除课程
 */
async function deleteCourse(courseId) {
    if (!confirm('确定要删除这门课程吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('删除成功！');
            loadCourses();
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除课程失败:', error);
        alert('删除失败，请稍后重试');
    }
}

/**
 * 显示模态框
 */
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('modalOverlay').classList.add('active');
}

/**
 * 关闭模态框（点击遮罩层）
 */
function closeModal(event) {
    if (event.target.id === 'modalOverlay') {
        closeModalDirectly();
    }
}

/**
 * 直接关闭模态框
 */
function closeModalDirectly() {
    document.getElementById('modalOverlay').classList.remove('active');
}

/**
 * 刷新数据
 */
function refreshData() {
    switch(currentSection) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'courses':
            loadCourses();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

/**
 * HTML转义防止XSS攻击
 */
function escapeHtml(text) {
    if (!text) return '-';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}