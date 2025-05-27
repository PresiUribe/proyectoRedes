// Variables globales
    let currentUser = null;
    let currentPaymentPropertyId = null;
    let currentPropertyCost = 0;
    let currentPage = 1;
    const itemsPerPage = 20;
    let totalProperties = 0;
    let totalPages = 1;
    let currentAdminPage     = 1;
    const adminItemsPerPage  = 10;
    let adminTotalPages      = 1;

// Llamamos SIEMPRE al gateway en el puerto 80:
const API_BASE_URL = 'http://localhost';   // << puerto 80

const BASE_USERS_URL      = `${API_BASE_URL}`;
const BASE_PROPERTIES_URL = `${API_BASE_URL}`;
const BASE_PAGOS_URL      = `${API_BASE_URL}`;
const BASE_RESERVAS_URL   = `${API_BASE_URL}`;

    $('#loginForm').submit(function(e) {
  e.preventDefault();

  const usuario  = $('#loginUser').val().trim();
  const password = $('#loginPassword').val().trim();

  $.ajax({
    url: `${BASE_USERS_URL}/usuarios/login`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ usuario, password }),
      success: function(response) {
        currentUser = response;
        $('#loginModal').modal('hide');
        alert('Login exitoso. Bienvenido ' + currentUser.nombre);
        $('#authButtons').hide();

        if (currentUser.tipo === 'admin') {
          $('#propertySection').hide();
          $('#adminSection').show();
          loadPendingPayments();
          loadAdminProperties();
          $('#adminButton').show();
        } else {
          $('#propertySection').show();
          loadCities();
          loadProperties();
        }
      },
      error: function(xhr) {
        if (xhr.status === 401) {
          alert('Credenciales inválidas');
        } else {
          alert('Error al iniciar sesión: ' + xhr.responseText);
        }
      }
    });
  });


      // Registro
      $('#registerForm').submit(function(e) {
        e.preventDefault();
        const nombre = $('#regNombre').val().trim();
        const email = $('#regEmail').val().trim();
        const usuario = $('#regUsuario').val().trim();
        const password = $('#regPassword').val();
        const tipo = $('#regTipo').val();
        const medio_pago = $('#regMedioPago').val().trim().toLowerCase();
        const numero_tarjeta = $('#regNumeroTarjeta').val().trim();
        const cvc = $('#regCvc').val().trim();
        const fecha_expiracion = $('#regFechaExp').val().trim();

        if (nombre === "") { alert("El nombre es obligatorio"); return; }
        if (!validateEmail(email)) { alert("El email no es válido"); return; }
        if (usuario === "") { alert("El usuario es obligatorio"); return; }
        if (password.length < 6) { alert("La contraseña debe tener al menos 6 caracteres"); return; }
        if (!['huesped', 'admin'].includes(tipo)) { alert("El tipo debe ser 'huesped' o 'admin'"); return; }
        if (!['debito', 'credito'].includes(medio_pago)) { alert("El medio de pago debe ser 'debito' o 'credito'"); return; }
        if (numero_tarjeta.length !== 16 || isNaN(numero_tarjeta)) { alert("El número de tarjeta debe tener 16 dígitos numéricos"); return; }
        if (cvc.length !== 3 || isNaN(cvc)) { alert("El CVC debe tener 3 dígitos numéricos"); return; }
        if (!/^\d{4}$/.test(fecha_expiracion)) { alert("La fecha de expiración debe tener 4 dígitos (MMYY)"); return; }

        $.ajax({
          url: `${BASE_USERS_URL}/usuarios`,
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ nombre, email, usuario, password, tipo, tipo_tarjeta: medio_pago, numero_tarjeta, cvc, fecha_expiracion }),
          success: function() {
            alert('Usuario registrado exitosamente');
            $('#registerModal').modal('hide');
          },
          error: function(xhr) {
            alert('Error al registrar usuario: ' + xhr.responseText);
          }
        });
      });

      // Filtros (modificado para paginación)
      $('#filterForm').submit(function(e) {
        e.preventDefault();
        currentPage = 1; // ⚡ PAGINACIÓN ⚡ Resetear a página 1
        loadProperties();
      });

      // Reserva (vista huesped): Al crear la reserva, se marca como "disponible"
      $('#reserveForm').submit(function(e) {
        e.preventDefault();
        if (!currentUser) { alert('Debes iniciar sesión para reservar'); return; }
        const propiedad_id = $('#propiedadId').val();
        const fecha_reserva = $('#fechaReserva').val();
        $.ajax({
          url: `${BASE_RESERVAS_URL}/reservas`,
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ usuario_id: currentUser.id, propiedad_id, fecha_reserva, estado: 'disponible' }),
          success: function(resp) {
            alert('Reserva creada. ID: ' + resp.reserva_id);
            $('#reserveModal').modal('hide');
            loadProperties();
          },
          error: function(xhr) {
            alert('Error al crear la reserva: ' + xhr.responseText);
          }
        });
      });

      // Pago (vista huesped): Al pagar, se envía estado "pendiente"
      $('#paymentForm').submit(function(e) {
        e.preventDefault();
        const pagoMonto = parseFloat($('#pagoMonto').val());
        if (pagoMonto < currentPropertyCost) {
          alert('El monto ingresado es menor al costo de la propiedad ($' + currentPropertyCost + ')');
          return;
        }
        const reserva_id = $('#pagoReservaId').val();
        $.ajax({
          url: `${BASE_PAGOS_URL}/pagos`,
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ reserva_id, monto: pagoMonto, estado: 'pendiente' }),
          success: function(resp) {
            alert('Pago procesado. ID Pago: ' + resp.pago_id);
            $('#paymentModal').modal('hide');
            loadProperties();
          },
          error: function(xhr) {
            alert('Error al procesar el pago: ' + xhr.responseText);
          }
        });
      });

    // Cargar ciudades
    function loadCities() {
  $.ajax({
    url: `${BASE_PROPERTIES_URL}/propiedades`,
    method: 'GET',
    success: function(resp) {
      // resp.data es el array de propiedades
      const items = resp.data || [];
      const uniqueCities = [...new Set(items.map(item => item.city))];
      $('#cityFilter').empty().append('<option value="">Todas</option>');
      uniqueCities.forEach(city => {
        $('#cityFilter').append(`<option value="${city}">${city}</option>`);
      });
    },
    error: function() {
      console.log('Error al cargar ciudades');
    }
  });
}

   // Cargar propiedades (vista huésped)
function loadProperties() {
  const ciudad     = $('#cityFilter').val()   || '';
  const precio_min = $('#minPrice').val()     || '';
  const precio_max = $('#maxPrice').val()     || '';
  const bedrooms_count    = $('#roomCount').val()    || '';

  // Montar URL con page y limit
  let url = `${BASE_PROPERTIES_URL}/propiedades?page=${currentPage}&limit=${itemsPerPage}`;
  const params = [];
  if (ciudad)     params.push(`city=${ciudad}`);
  if (precio_min) params.push(`precio_min=${precio_min}`);
  if (precio_max) params.push(`precio_max=${precio_max}`);
  if (bedrooms_count)    params.push(`bedrooms_count=${bedrooms_count}`);
  if (params.length) url += '&' + params.join('&');
console.log('→ Fetching:', url);
  $.ajax({
    url,
    method: 'GET',
    success: function(resp) {
      // 1) Extraemos el array y la paginación
      const properties = resp.data || [];
      const pg         = resp.pagination || {};
      totalProperties  = pg.total       || 0;
      currentPage      = pg.page        || 1;
      // opcional: itemsPerPage = pg.pageSize || itemsPerPage;
      totalPages       = pg.totalPages  || 1;

      // 2) Renderizamos tarjetas
      $('#propertiesContainer').empty();
      if (!properties.length) {
        $('#propertiesContainer').append('<p>No se encontraron propiedades.</p>');
      } else {
        properties.forEach(prop => {
          const estaDisponible = prop.disponible === 1 || prop.disponible === true;
          const card = `
            <div class="col-md-4" id="property-${prop.id}">
              <div class="card mb-3">
                <div class="card-body">
                  <p><strong>ID:</strong> ${prop.id}</p>
                  <h5 class="card-title">${prop.title}</h5>
                  <p class="card-text">${prop.description}</p>
                  <p><strong>Ciudad:</strong> ${prop.city}</p>
                  <p><strong>Precio:</strong> $${prop.average_rate_per_night}</p>
                  <p><strong>Cuartos:</strong> ${prop.bedrooms_count}</p>
                  <p><strong>Estado:</strong> ${estaDisponible ? 'Disponible' : 'No disponible'}</p>
                  <button class="btn btn-primary" onclick="openReserveModal(${prop.id}, ${prop.average_rate_per_night})" ${!estaDisponible?'disabled':''}>Reservar</button>
                  <button class="btn btn-success ms-2" onclick="openPaymentModal(${prop.id}, ${prop.average_rate_per_night})" ${!estaDisponible?'disabled':''}>Pagar</button>
                </div>
              </div>
            </div>`;
          $('#propertiesContainer').append(card);
        });
      }

      // 3) Actualizamos los controles de paginación
      updatePaginationControls();
    },
    error: function() {
      console.error('Error al cargar propiedades');
    }
  });
}

function updatePaginationControls() {
  const container = $('#pagination-controls');
  container.empty();

  // Botón Anterior
  $('<button>')
    .html('&laquo; Anterior')
    .prop('disabled', currentPage === 1)
    .click(() => {
      if (currentPage > 1) {
        currentPage--;
        loadProperties();
      }
    })
    .appendTo(container);

  // Info de página
  container.append(`<span class="page-info">Página ${currentPage} de ${totalPages}</span>`);

  // Selector de página
  const select = $('<select class="page-select">')
    .change(e => {
      currentPage = +e.target.value;
      loadProperties();
    })
    .appendTo(container);

  for (let i = 1; i <= totalPages; i++) {
    select.append($('<option>')
      .val(i)
      .text(i)
      .prop('selected', i === currentPage)
    );
  }

  // Botón Siguiente
  $('<button>')
    .html('Siguiente &raquo;')
    .prop('disabled', currentPage >= totalPages)
    .click(() => {
      if (currentPage < totalPages) {
        currentPage++;
        loadProperties();
      }
    })
    .appendTo(container);
}


    // Cargar propiedades para la vista admin
   function loadAdminProperties(page = currentAdminPage) {
  $.ajax({
    url: `${BASE_PROPERTIES_URL}/propiedades?page=${page}&limit=${adminItemsPerPage}`,
    method: 'GET',
    success: function(resp) {
      const props = resp.data || [];
      const pg    = resp.pagination || {};

      // Actualizamos estado
      currentAdminPage = pg.page        || page;
      adminTotalPages  = pg.totalPages  || 1;

      // Renderizamos tarjetas
      let html = '';
      if (!props.length) {
        html = '<p>No se encontraron propiedades.</p>';
      } else {
        props.forEach(prop => {
          html += `
            <div class="card mb-3">
              <div class="card-body">
                <p><strong>ID:</strong> ${prop.id}</p>
                <p><strong>Título:</strong> ${prop.title}</p>
                <p><strong>Disponible:</strong> ${prop.disponible ? 'Sí' : 'No'}</p>
                <button class="btn btn-info"
                        onclick="toggleDisponibilidad(${prop.id}, ${prop.disponible})">
                  Cambiar Disponibilidad
                </button>
              </div>
            </div>`;
        });
      }
      $('#adminProperties').html(html);

      // Renderizamos controles de paginación
      renderAdminPagination();
    },
    error: function() {
      $('#adminProperties').html('<p>Error al cargar propiedades para administración.</p>');
    }
  });
}

function renderAdminPagination() {
  const container = $('#admin-pagination-controls');
  container.empty();

  // Botón «Anterior»
  $('<button>')
    .text('« Anterior')
    .prop('disabled', currentAdminPage === 1)
    .addClass('btn btn-secondary me-2')
    .click(() => loadAdminProperties(currentAdminPage - 1))
    .appendTo(container);

  // Info de página
  container.append(
    `<span class="page-info align-middle">Página ${currentAdminPage} de ${adminTotalPages}</span>`
  );

  // Botón «Siguiente»
  $('<button>')
    .text('Siguiente »')
    .prop('disabled', currentAdminPage >= adminTotalPages)
    .addClass('btn btn-secondary ms-2')
    .click(() => loadAdminProperties(currentAdminPage + 1))
    .appendTo(container);
}


// Función para cambiar el estado de disponibilidad de una propiedad
function toggleDisponibilidad(propId, currentValue) {
  const nuevoValor = !currentValue;
  $.ajax({
    url: `${BASE_PROPERTIES_URL}/propiedades/${propId}/disponibilidad`,
    method: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify({ disponible: nuevoValor }),
    success: function() {
      alert('Disponibilidad actualizada a ' + (nuevoValor ? 'Disponible' : 'No disponible'));
      loadAdminProperties();
      loadProperties();
    },
    error: function(xhr) {
      alert('Error al actualizar la disponibilidad: ' + xhr.responseText);
    }
  });
}
  // Función para que el admin cambie manualmente el estado de la reserva de una propiedad
  function toggleReservaEstado(propId) {
  $.ajax({
    url: `${BASE_RESERVAS_URL}/reservas/estado/${propId}`,
    method: 'GET',
    success: function(resp) {
      // resp = { estado: "disponible" } o "pendiente" o "no disponible"
      if (!resp || !resp.estado) {
        alert('No hay reserva para esta propiedad');
        return;
      }
      const currentState = resp.estado.toLowerCase();
      // Decidir nuevo estado
      let newState = (currentState === 'disponible') ? 'no disponible' : 'disponible';

      // Llamar a PUT /reservas/estado/:propId
      $.ajax({
        url: `${BASE_RESERVAS_URL}/reservas/estado/${propId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ estado: newState }),
        success: function() {
          alert('Reserva actualizada a ' + newState);
          loadAdminProperties();
          loadProperties();
        },
        error: function(xhr) {
          alert('Error al actualizar la reserva: ' + xhr.responseText);
        }
      });
    },
    error: function() {
      alert('Error al obtener la reserva');
    }
  });
}


    // Abrir modal de reserva (vista huesped)
    function openReserveModal(propId, cost) {
      if (!currentUser) { alert('Debes iniciar sesión para reservar'); return; }
      if($(`#btnReservar-${propId}`).prop('disabled')){
        alert('Esta propiedad no está disponible para reservar');
        return;
      }
      $('#propiedadId').val(propId);
      $('#reserveModal').modal('show');
    }

    // Abrir modal de pago (vista huesped)
    function openPaymentModal(propId, cost) {
      if (!currentUser) { alert('Debes iniciar sesión para pagar'); return; }
      if($(`#btnPagar-${propId}`).prop('disabled')){
        alert('Esta propiedad no está disponible para pagar');
        return;
      }
      currentPaymentPropertyId = propId;
      currentPropertyCost = parseFloat(cost);
      $('#paymentModal').modal('show');
    }

    // Mostrar sección admin (vista admin)
    function showAdminSection() {
      $('#adminSection').show();
      loadPendingPayments();
      loadAdminProperties();
    }

    function hideAdminSection() {
      $('#adminSection').hide();
    }

    // Cargar pagos pendientes (vista admin)
    function loadPendingPayments() {
  $.ajax({
    url: `${BASE_PAGOS_URL}/pagos/pending`,
    method: 'GET',
    success: function(data) {
      let html = '';
      if (data.length === 0) {
        html = '<p>No hay pagos pendientes.</p>';
      } else {
        data.forEach(payment => {
          html += `
            <div class="card mb-2">
              <div class="card-body">
                <p><strong>ID Pago:</strong> ${payment.id}</p>
                <p><strong>ID Reserva:</strong> ${payment.reserva_id}</p>
                <p><strong>ID Propiedad:</strong> ${payment.propiedad_id || 'N/A'}</p>
                <p><strong>Monto:</strong> $${payment.monto}</p>
                <p><strong>Estado:</strong> ${payment.estado}</p>
                <button class="btn btn-success"
                        onclick="aceptarPago(${payment.id}, ${payment.reserva_id})">
                  Aceptar Pago
                </button>
              </div>
            </div>`;
        });
      }
      $('#pendingPayments').html(html);
    },
    error: function() {
      $('#pendingPayments').html('<p>Error al cargar pagos pendientes.</p>');
    }
  });
}

    // Función para que el admin actualice la reserva a disponible (vista admin)
    // Esta función actualiza directamente el estado de la reserva a "disponible"
    function setReservaDisponible(propId) {
      $.ajax({
        url: `${BASE_RESERVAS_URL}/reservas/estado/${propId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ estado: 'disponible' }),
        success: function(resp) {
          alert('La reserva ha sido actualizada a disponible');
          loadAdminProperties();
          loadProperties();
        },
        error: function(xhr) {
          alert('Error al actualizar la reserva: ' + xhr.responseText);
        }
      });
    }

    // Función para que el admin acepte un pago pendiente y actualice la reserva a no disponible
    function aceptarPago(paymentId, reservaId) {
      $.ajax({
        url: `${BASE_PAGOS_URL}/pagos/aceptar/${paymentId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ estado: 'aprobado' }),
        success: function(resp) {
          alert('Pago aceptado.');
          // Luego actualizamos la reserva a "no disponible"
          $.ajax({
            url: `${BASE_RESERVAS_URL}/reservas/${reservaId}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ estado: 'no disponible' }),
            success: function() {
              alert('Reserva actualizada a no disponible.');
              loadPendingPayments();
              loadAdminProperties();
            },
            error: function(xhr) {
              alert('Error al actualizar la reserva: ' + xhr.responseText);
            }
          });
        },
        error: function(xhr) {
          alert('Error al aceptar el pago: ' + xhr.responseText);
        }
      });
    }
    // funcion de validacion en tiempo real para el formulario de registro
document.addEventListener("DOMContentLoaded", function () {
  const emailInput = document.getElementById("regEmail");
  const usuarioInput = document.getElementById("regUsuario");
  const passwordInput = document.getElementById("regPassword");
  const tarjetaInput = document.getElementById("regNumeroTarjeta");
  const cvcInput = document.getElementById("regCvc");
  const expInput = document.getElementById("regFechaExp");

  const emailError = document.getElementById("email-error");
  const usuarioError = document.getElementById("usuario-error");
  const passwordError = document.getElementById("password-error");
  const tarjetaError = document.getElementById("contador-tarjeta");
  const cvcError = document.getElementById("contador-cvc");
  const expError = document.getElementById("contador-exp");

  // Validación email
  if (emailInput && emailError) {
    emailInput.addEventListener("input", () => {
      if (!validateEmail(emailInput.value)) {
        emailError.textContent = "El email no es válido";
      } else {
        emailError.textContent = "";
      }
    });
  }

  // Validación usuario
  if (usuarioInput && usuarioError) {
    usuarioInput.addEventListener("input", () => {
      if (usuarioInput.value.trim() === "") {
        usuarioError.textContent = "El usuario es obligatorio";
      } else {
        usuarioError.textContent = "";
      }
    });
  }

  // Validación contraseña
  if (passwordInput && passwordError) {
    passwordInput.addEventListener("input", () => {
      if (passwordInput.value.length < 4) {
        passwordError.textContent = "La contraseña debe tener al menos 4 caracteres";
      } else {
        passwordError.textContent = "";
      }
    });
  }

  // Validación número de tarjeta
  if (tarjetaInput && tarjetaError) {
    tarjetaInput.addEventListener("input", () => {
      if (/[^0-9]/.test(tarjetaInput.value)) {
        tarjetaError.textContent = "Solo se permiten números (sin espacios ni letras)";
      } else if (!validateCreditCard(tarjetaInput.value)) {
        tarjetaError.textContent = "Debe tener 16 dígitos numéricos";
      } else {
        tarjetaError.textContent = "";
      }
    });
  }

  // Validación CVC
  if (cvcInput && cvcError) {
    cvcInput.addEventListener("input", () => {
      if (/[^0-9]/.test(cvcInput.value)) {
        cvcError.textContent = "Solo se permiten números (sin letras)";
      } else if (!validateCVC(cvcInput.value)) {
        cvcError.textContent = "Debe tener 3 dígitos numéricos";
      } else {
        cvcError.textContent = "";
      }
    });
  }

  // Validación fecha de expiración
  if (expInput && expError) {
    expInput.addEventListener("input", () => {
      if (/[^0-9]/.test(expInput.value)) {
        expError.textContent = "Solo se permiten números (MMYY, sin letras)";
      } else if (!validateExpirationDate(expInput.value)) {
        expError.textContent = "Formato: MMYY (ej: 0527)";
      } else {
        expError.textContent = "";
      }
    });
  }
});

// funcion para validar tarjeta de credito en tiempo real
function validateCreditCard(cardNumber) {
  const re = /^\d{16}$/; // 16 dígitos
  return re.test(cardNumber);
}

// funcion para validar cvc en tiempo real
function validateCVC(cvc) {
  const re = /^\d{3}$/; // 3 dígitos
  return re.test(cvc);
}

// funcion para validar fecha de expiracion en tiempo real
function validateExpirationDate(date) {
  const re = /^(0[1-9]|1[0-2])\d{2}$/; // MMYY
  return re.test(date);
}

// función para validar email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

$('#registerModal').on('shown.bs.modal', function () {
  const tarjetaInput = document.getElementById("regNumeroTarjeta");
  const tarjetaError = document.getElementById("contador-tarjeta");
  const cvcInput = document.getElementById("regCvc");
  const cvcError = document.getElementById("contador-cvc");
  const expInput = document.getElementById("regFechaExp");
  const expError = document.getElementById("contador-exp");

  // Validación número de tarjeta
  if (tarjetaInput && tarjetaError && !tarjetaInput.hasListener) {
    tarjetaInput.addEventListener("input", function handler() {
      if (/[^0-9]/.test(tarjetaInput.value)) {
        tarjetaError.textContent = "Solo se permiten números (sin espacios ni letras)";
      } else if (!validateCreditCard(tarjetaInput.value)) {
        tarjetaError.textContent = "Debe tener 16 dígitos numéricos";
      } else {
        tarjetaError.textContent = "";
      }
    });
    tarjetaInput.hasListener = true;
  }

  // Validación CVC
  if (cvcInput && cvcError && !cvcInput.hasListener) {
    cvcInput.addEventListener("input", function handler() {
      if (/[^0-9]/.test(cvcInput.value)) {
        cvcError.textContent = "Solo se permiten números (sin letras)";
      } else if (!validateCVC(cvcInput.value)) {
        cvcError.textContent = "Debe tener 3 dígitos numéricos";
      } else {
        cvcError.textContent = "";
      }
    });
    cvcInput.hasListener = true;
  }

  // Validación fecha de expiración
  if (expInput && expError && !expInput.hasListener) {
    expInput.addEventListener("input", function handler() {
      if (/[^0-9]/.test(expInput.value)) {
        expError.textContent = "Solo se permiten números (MMYY, sin letras)";
      } else if (!validateExpirationDate(expInput.value)) {
        expError.textContent = "Formato: MMYY (ej: 0527)";
      } else {
        expError.textContent = "";
      }
    });
    expInput.hasListener = true;
  }
});
