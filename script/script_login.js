<script>
 var x = document.getElementById('login');
        var y = document.getElementById('register');
        var z = document.getElementById('btn');

        function login(){
            x.style.left = "27px";
            y.style.right = "-350px";
            z.style.left = "0px";
        }
        function register(){
            x.style.left = "-350px";
            y.style.right = "25px";
            z.style.left = "150px";
        }


   // View Password codes

         
      
        function myLogPassword(){

         var a = document.getElementById("logPassword");
         var b = document.getElementById("eye");
         var c = document.getElementById("eye-slash");

         if(a.type === "password"){
            a.type = "text";
            b.style.opacity = "0";
            c.style.opacity = "1";
         }else{
            a.type = "password";
            b.style.opacity = "1";
            c.style.opacity = "0";
         }

        }

        function myRegPassword(){
    
         var d = document.getElementById("regPassword");
         var b = document.getElementById("eye-2");
         var c = document.getElementById("eye-slash-2");
 
         if(d.type === "password"){
            d.type = "text";
            b.style.opacity = "0";
            c.style.opacity = "1";
         }else{
            d.type = "password";
            b.style.opacity = "1";
            c.style.opacity = "0";
         }

        }


        // Function to validate login credentials
      function validateLogin() {
        // แสดง Loading Spinner
        document.getElementById("cover-spin").style.display = "block";
        //document.getElementById("loading").style.display = "block";

        google.script.run.withSuccessHandler(function(response) {
          if(response.success) {
            // สมมติว่า userID เป็นค่าที่ได้จากการเข้าสู่ระบบ (response อาจเป็นข้อมูลที่ได้จาก server เช่น userID หรือข้อมูลอื่นๆ)
        sessionStorage.setItem('userID', response.userID);
        sessionStorage.setItem('userName', response.userName);
        sessionStorage.setItem('userPosition', response.userPosition);
        sessionStorage.setItem('userSub', response.userSub);
        sessionStorage.setItem('daysSick', response.daysSick);
        sessionStorage.setItem('daysBusiness', response.daysBusiness);
        sessionStorage.setItem('daysSumSB', response.daysSumSB);
        sessionStorage.setItem('daysHoliday', response.daysHoliday);
        sessionStorage.setItem('daysHolidayUse', response.daysHolidayUse);
        sessionStorage.setItem('daysHolidayTotal', response.daysHolidayTotal);
        sessionStorage.setItem('daysLate', response.daysLate);
        alertPopup({message: "เข้าสู่ระบบสำเร็จ", icon: "success"});
            // Redirects to the menu page if login is successful
            google.script.run.withSuccessHandler(function(html) {
              document.open();
              document.write(html);
              document.close();
            }).getMenuPage();
          } else {
            // ซ่อน Loading Spinner และแจ้งเตือนเมื่อเข้าสู่ระบบไม่สำเร็จ
            //document.getElementById("loading").style.display = "none";
            document.getElementById("cover-spin").style.display = "none";
            // Shows an alert if credentials are invalid
            alertPopup({message: "ไม่พบข้อมูลผู้ใช้งาน", icon: "error"});
            //window.alert('Invalid Credentials');
          }
        }).checkLogin(document.getElementById('logUsername').value, document.getElementById('logPassword').value);
      }

      /******** Sweetalert2 *********/
  function alertPopup(res){
    Swal.fire({
      toast: true,
      position: "center",
      iconColor: 'white',
      icon: res.icon,
      customClass: {
        popup: 'colored-toast',
      },
      title: res.message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }
</script>