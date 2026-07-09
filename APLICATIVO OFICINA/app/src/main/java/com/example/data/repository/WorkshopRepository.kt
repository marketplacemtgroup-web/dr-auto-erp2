package com.example.data.repository

import android.content.Context
import android.net.Uri
import com.example.data.api.*
import com.example.data.mapper.ApiMappers
import com.example.data.model.*
import com.example.data.service.ApiException
import com.example.data.service.HttpClient
import com.example.data.service.SessionManager
import com.example.util.ChecklistTemplate
import com.example.util.ImageUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import retrofit2.HttpException
import java.io.File

object WorkshopRepository {
    private val api get() = HttpClient.api

    private suspend fun <T> fetchAllPages(
        fetch: suspend (page: Int, limit: Int) -> Pair<List<T>, PaginationMetaDto?>,
    ): List<T> {
        val limit = WorkshopApi.LIST_LIMIT
        var page = 1
        val all = mutableListOf<T>()
        while (true) {
            val (rows, pagination) = fetch(page, limit)
            all.addAll(rows)
            if (pagination == null || page >= pagination.totalPages) break
            page++
        }
        return all
    }

    private suspend fun listAllServiceOrders(search: String? = null): List<ServiceOrderRowDto> =
        fetchAllPages { page, limit ->
            val response = api.listServiceOrders(search = search, page = page, limit = limit)
            response.data to response.pagination
        }

    private suspend fun listAllProducts(search: String? = null): List<ProductRowDto> =
        fetchAllPages { page, limit ->
            val response = api.listProducts(search = search, page = page, limit = limit)
            response.data to response.pagination
        }

    private suspend fun listAllVehicles(search: String? = null): List<VehicleRowDto> =
        fetchAllPages { page, limit ->
            val response = api.listVehicles(search = search, page = page, limit = limit)
            response.data to response.pagination
        }

    private val _isOfflineMode = MutableStateFlow(false)
    val isOfflineMode: StateFlow<Boolean> = _isOfflineMode

    private val _lastApiError = MutableStateFlow<String?>(null)
    val lastApiError: StateFlow<String?> = _lastApiError

    private var cachedOrders: List<Order> = emptyList()
    private var cachedEmployees: List<Employee> = emptyList()
    private var cachedProducts: List<Product> = emptyList()
    private var cachedServices: List<ServiceCatalog> = emptyList()
    private var catalogsLoaded = false

    private val _employeesFlow = MutableStateFlow<List<Employee>>(emptyList())
    val employeesFlow: StateFlow<List<Employee>> = _employeesFlow.asStateFlow()

    private val _productsFlow = MutableStateFlow<List<Product>>(emptyList())
    val productsFlow: StateFlow<List<Product>> = _productsFlow.asStateFlow()

    private val _serviceCatalogFlow = MutableStateFlow<List<ServiceCatalog>>(emptyList())
    val serviceCatalogFlow: StateFlow<List<ServiceCatalog>> = _serviceCatalogFlow.asStateFlow()

    fun clearLastError() {
        _lastApiError.value = null
    }

    fun toggleOfflineMode() {
        _isOfflineMode.value = !_isOfflineMode.value
    }

    private suspend fun <T> apiCall(
        fallback: (() -> T)? = null,
        block: suspend () -> T,
    ): T {
        if (_isOfflineMode.value) {
            val cached = fallback?.invoke()
            if (cached != null) return cached
            throw IllegalStateException("Modo offline — sem dados em cache")
        }
        if (HttpClient.useMockData) {
            return mockBlock(block, fallback)
        }
        return try {
            val result = block()
            _lastApiError.value = null
            result
        } catch (e: HttpException) {
            val msg = when (e.code()) {
                401 -> "Sessão expirada — faça login novamente"
                403 -> "Sem permissão para esta ação"
                else -> "Erro na API (${e.code()})"
            }
            _lastApiError.value = msg
            fallback?.invoke() ?: throw ApiException(e.code(), msg)
        } catch (e: Exception) {
            _lastApiError.value = e.message ?: "Falha de conexão"
            fallback?.invoke() ?: throw e
        }
    }

    private suspend fun <T> mockBlock(
        real: suspend () -> T,
        fallback: (() -> T)?,
    ): T {
        return fallback?.invoke() ?: real()
    }

    suspend fun getMetrics(): Map<String, Int> = apiCall(
        fallback = {
            ApiMappers.dashboardMetrics(DashboardKpisDto(), cachedOrders)
        },
    ) {
        val kpis = api.dashboardKpis()
        refreshOrdersCache()
        ApiMappers.dashboardMetrics(kpis, cachedOrders)
    }

    private suspend fun refreshOrdersCache(search: String? = null) {
        val rows = listAllServiceOrders(search = search?.ifBlank { null })
        cachedOrders = rows.map { ApiMappers.toOrder(it) }
    }

    suspend fun getOrders(query: String = "", statusFilter: String = "Todas"): List<Order> = apiCall(
        fallback = { filterLocal(cachedOrders, query, statusFilter) },
    ) {
        refreshOrdersCache(search = query.ifBlank { null })
        filterLocal(cachedOrders, query, statusFilter)
    }

    private fun filterLocal(orders: List<Order>, query: String, statusFilter: String): List<Order> =
        orders.filter { order ->
            val matchesQuery = query.isBlank() ||
                order.clientName.contains(query, ignoreCase = true) ||
                order.vehicleName.contains(query, ignoreCase = true) ||
                order.vehiclePlate.contains(query, ignoreCase = true) ||
                order.displayNumber.contains(query)
            matchesQuery && ApiMappers.matchesStatusFilter(order, statusFilter)
        }

    suspend fun getOrderById(id: String): Order = apiCall {
        val dto = api.getServiceOrder(id)
        ApiMappers.toOrderDetail(dto)
    }

    suspend fun updateOrderStatus(
        id: String,
        status: OrderStatus,
        diagnosis: String = "",
        customerVisibleNotes: String = "",
    ): Boolean = apiCall {
        api.updateServiceOrder(
            id,
            UpdateServiceOrderRequest(
                status = status.apiCode,
                diagnosis = diagnosis.trim().ifBlank { null },
                customerVisibleNotes = customerVisibleNotes.trim().ifBlank { null },
            ),
        )
        true
    }

    suspend fun updateOrderNotes(
        id: String,
        complaint: String? = null,
        diagnosis: String? = null,
        customerVisibleNotes: String? = null,
    ): Boolean = apiCall {
        api.updateServiceOrder(
            id,
            UpdateServiceOrderRequest(
                complaint = complaint?.trim()?.ifBlank { null },
                diagnosis = diagnosis?.trim()?.ifBlank { null },
                customerVisibleNotes = customerVisibleNotes?.trim()?.ifBlank { null },
            ),
        )
        true
    }

    suspend fun getChecklistPhotos(orderId: String): List<ChecklistPhoto> = apiCall {
        val dto = api.getServiceOrder(orderId)
        val attachments = dto.attachments.orEmpty()
        ApiMappers.toChecklistPhotos(orderId, dto.checklistItems.orEmpty(), attachments)
    }

    suspend fun updateChecklistItem(
        orderId: String,
        photoId: String,
        status: PhotoChecklistStatus,
        observation: String,
        photoUri: String? = null,
    ): Boolean = batchUpdateChecklist(
        orderId = orderId,
        updates = mapOf(photoId to (status to observation)),
    )

    suspend fun batchUpdateChecklist(
        orderId: String,
        updates: Map<String, Pair<PhotoChecklistStatus?, String>>,
    ): Boolean = apiCall {
        val current = api.getServiceOrder(orderId)
        val items = current.checklistItems.orEmpty().map { item ->
            val update = updates[item.id]
            if (update != null) {
                ChecklistItemUpdateDto(
                    id = item.id,
                    result = update.first?.apiCode,
                    notes = update.second.ifBlank { null },
                )
            } else {
                ChecklistItemUpdateDto(
                    id = item.id,
                    result = item.result,
                    notes = item.notes,
                )
            }
        }
        api.updateChecklist(orderId, UpdateChecklistRequest(items))
        true
    }

    suspend fun updateChecklistTextItem(
        orderId: String,
        itemId: String,
        text: String,
    ): Boolean = apiCall {
        val current = api.getServiceOrder(orderId)
        val items = current.checklistItems.orEmpty().map { item ->
            if (item.id == itemId) {
                ChecklistItemUpdateDto(
                    id = item.id,
                    result = null,
                    notes = text.trim().ifBlank { null },
                )
            } else {
                ChecklistItemUpdateDto(
                    id = item.id,
                    result = item.result,
                    notes = item.notes,
                )
            }
        }
        api.updateChecklist(orderId, UpdateChecklistRequest(items))
        true
    }

    suspend fun uploadChecklistPhoto(
        context: Context,
        orderId: String,
        checklistItemId: String,
        label: String,
        localUri: Uri,
    ): Boolean = withContext(Dispatchers.IO) {
        apiCall {
            val file = uriToUploadFile(context, localUri)
            val category = ApiMappers.checklistCategorySlug(label)
            val fileName = "checklist-${System.currentTimeMillis()}.webp"
            uploadAttachmentFile(orderId, file, fileName, category, visibleToCustomer = true, showOnQuote = false)
            file.delete()
            true
        }
    }

    suspend fun uploadChecklistPhotoFile(
        orderId: String,
        label: String,
        file: File,
    ): Boolean = withContext(Dispatchers.IO) {
        apiCall {
            val category = ApiMappers.checklistCategorySlug(label)
            val fileName = "checklist-${System.currentTimeMillis()}.webp"
            uploadAttachmentFile(orderId, file, fileName, category, visibleToCustomer = true, showOnQuote = false)
            true
        }
    }

    suspend fun uploadWorkPhotoFile(orderId: String, file: File): AttachmentDto = withContext(Dispatchers.IO) {
        apiCall {
            val fileName = "servico-${System.currentTimeMillis()}.webp"
            uploadAttachmentFile(
                orderId = orderId,
                file = file,
                fileName = fileName,
                category = "general",
                visibleToCustomer = true,
                showOnQuote = true,
            )
        }
    }

    suspend fun listWorkPhotoAttachments(orderId: String): List<AttachmentDto> = apiCall {
        val dto = api.getServiceOrder(orderId)
        dto.attachments.orEmpty().filter { attachment ->
            (attachment.mimeType ?: "").startsWith("image/") &&
                !(attachment.category ?: "").startsWith("checklist-")
        }
    }

    private fun uriToUploadFile(context: Context, localUri: Uri): File {
        val file = ImageUtils.uriToWebpFile(context, localUri)
            ?: throw IllegalStateException("Não foi possível processar a foto")
        if (file.length() == 0L) {
            file.delete()
            throw IllegalStateException("A foto está vazia — tente fotografar novamente")
        }
        return file
    }

    private suspend fun uploadAttachmentFile(
        orderId: String,
        file: File,
        fileName: String,
        category: String,
        visibleToCustomer: Boolean,
        showOnQuote: Boolean,
    ): AttachmentDto {
        val mimeType = ImageUtils.WEBP_MIME
        return try {
            uploadAttachmentViaApi(orderId, file, fileName, mimeType, category, visibleToCustomer, showOnQuote)
        } catch (apiUploadError: Exception) {
            try {
                uploadAttachmentDirect(orderId, file, fileName, mimeType, category, visibleToCustomer, showOnQuote)
            } catch (directError: Exception) {
                throw IllegalStateException(
                    apiUploadError.message ?: directError.message ?: "Falha ao enviar foto",
                )
            }
        }
    }

    private suspend fun uploadAttachmentViaApi(
        orderId: String,
        file: File,
        fileName: String,
        mimeType: String,
        category: String,
        visibleToCustomer: Boolean,
        showOnQuote: Boolean,
    ): AttachmentDto {
        val body = file.asRequestBody(mimeType.toMediaType())
        val part = MultipartBody.Part.createFormData("file", fileName, body)
        return api.uploadServiceOrderAttachment(
            serviceOrderId = orderId,
            file = part,
            category = category,
            visibleToCustomer = if (visibleToCustomer) "true" else "false",
            showOnQuote = if (showOnQuote) "true" else "false",
        )
    }

    private suspend fun uploadAttachmentDirect(
        orderId: String,
        file: File,
        fileName: String,
        mimeType: String,
        category: String,
        visibleToCustomer: Boolean,
        showOnQuote: Boolean,
    ): AttachmentDto {
        val prep = api.prepareUpload(
            orderId,
            PrepareUploadRequest(
                fileName = fileName,
                mimeType = mimeType,
                category = category,
                visibleToCustomer = visibleToCustomer,
                showOnQuote = showOnQuote,
            ),
        )
        val putHeaders = prep.headers?.toMutableMap() ?: mutableMapOf()
        putHeaders["Content-Type"] = mimeType
        if (!prep.token.isNullOrBlank()) {
            putHeaders["Authorization"] = "Bearer ${prep.token}"
        }
        val putBody = file.asRequestBody(mimeType.toMediaType())
        val putRequest = Request.Builder()
            .url(prep.uploadUrl)
            .put(putBody)
            .apply { putHeaders.forEach { (k, v) -> addHeader(k, v) } }
            .build()
        val putRes = HttpClient.rawClient.newCall(putRequest).execute()
        if (!putRes.isSuccessful) {
            val detail = putRes.body?.string()?.take(200).orEmpty()
            throw ApiException(
                putRes.code,
                if (detail.isNotBlank()) "Falha ao enviar foto: $detail" else "Falha ao enviar foto (HTTP ${putRes.code})",
            )
        }
        return api.confirmUpload(
            orderId,
            ConfirmUploadRequest(
                storagePath = prep.storagePath,
                fileName = fileName,
                mimeType = mimeType,
                category = category,
                visibleToCustomer = visibleToCustomer,
            ),
        )
    }

    suspend fun completeChecklist(orderId: String): Boolean = apiCall {
        val current = api.getServiceOrder(orderId)
        val pending = current.checklistItems.orEmpty().any { item ->
            if (ChecklistTemplate.isTextOnly(item.label)) {
                item.notes.isNullOrBlank()
            } else {
                item.result == null
            }
        }
        if (pending) {
            throw IllegalStateException("Conclua todos os itens do checklist antes de finalizar")
        }
        if (current.status == OrderStatus.RECEIVED.apiCode) {
            api.updateServiceOrder(
                orderId,
                UpdateServiceOrderRequest(status = OrderStatus.DIAGNOSIS.apiCode),
            )
        }
        true
    }

    suspend fun getBudget(orderId: String): Budget = apiCall {
        val dto = api.getServiceOrder(orderId)
        ApiMappers.toBudget(dto)
    }

    suspend fun ensureCatalogs(force: Boolean = false): List<String> {
        if (!force && catalogsLoaded) return emptyList()
        val errors = mutableListOf<String>()
        apiCall {
            runCatching {
                cachedEmployees = api.listTechnicians().map { ApiMappers.toEmployee(it) }
                _employeesFlow.value = cachedEmployees
            }.onFailure { errors.add("Não foi possível carregar mecânicos: ${it.message ?: "erro desconhecido"}") }

            runCatching {
                cachedProducts = listAllProducts().map { ApiMappers.toProduct(it) }
                _productsFlow.value = cachedProducts
            }.onFailure { errors.add("Não foi possível carregar peças: ${it.message ?: "erro desconhecido"}") }

            runCatching {
                cachedServices = api.listServiceCatalog().map { ApiMappers.toServiceCatalog(it) }
                _serviceCatalogFlow.value = cachedServices
            }.onFailure { errors.add("Não foi possível carregar serviços: ${it.message ?: "erro desconhecido"}") }

            catalogsLoaded = true
        }
        return errors
    }

    val employees: List<Employee> get() = cachedEmployees
    val products: List<Product> get() = cachedProducts
    val serviceCatalog: List<ServiceCatalog> get() = cachedServices

    suspend fun searchProducts(query: String): List<Product> = apiCall(
        fallback = {
            val q = query.trim()
            if (q.isBlank()) cachedProducts
            else cachedProducts.filter {
                it.name.contains(q, ignoreCase = true) || it.code.contains(q, ignoreCase = true)
            }
        },
    ) {
        val rows = listAllProducts(search = query.trim().ifBlank { null })
        val results = rows.map { ApiMappers.toProduct(it) }
        if (query.isBlank()) {
            cachedProducts = results
            _productsFlow.value = results
        }
        results
    }

    suspend fun searchServices(query: String): List<ServiceCatalog> = apiCall(
        fallback = {
            val q = query.trim()
            if (q.isBlank()) cachedServices
            else cachedServices.filter {
                it.name.contains(q, ignoreCase = true) || it.code.contains(q, ignoreCase = true)
            }
        },
    ) {
        val rows = api.listServiceCatalog(search = query.trim().ifBlank { null })
        val results = rows.map { ApiMappers.toServiceCatalog(it) }
        if (query.isBlank()) {
            cachedServices = results
            _serviceCatalogFlow.value = results
        }
        results
    }

    suspend fun createServiceCatalog(name: String, price: Double): ServiceCatalog = apiCall {
        val row = api.createServiceCatalog(
            CreateServiceCatalogRequest(
                name = name.trim(),
                defaultPrice = price,
            ),
        )
        val created = ApiMappers.toServiceCatalog(row)
        cachedServices = (cachedServices + created).distinctBy { it.id }
        _serviceCatalogFlow.value = cachedServices
        created
    }

    suspend fun ensureProducts(force: Boolean = false): String? {
        if (!force && cachedProducts.isNotEmpty()) return null
        return runCatching {
            cachedProducts = listAllProducts().map { ApiMappers.toProduct(it) }
            _productsFlow.value = cachedProducts
        }.exceptionOrNull()?.message?.let { "Não foi possível carregar peças: $it" }
    }

    suspend fun ensureServicesAndEmployees(force: Boolean = false): List<String> {
        val errors = mutableListOf<String>()
        if (force || cachedServices.isEmpty()) {
            runCatching {
                cachedServices = api.listServiceCatalog().map { ApiMappers.toServiceCatalog(it) }
                _serviceCatalogFlow.value = cachedServices
            }.onFailure { errors.add("Não foi possível carregar serviços: ${it.message ?: "erro desconhecido"}") }
        }
        if (force || cachedEmployees.isEmpty()) {
            runCatching {
                cachedEmployees = api.listTechnicians().map { ApiMappers.toEmployee(it) }
                _employeesFlow.value = cachedEmployees
            }.onFailure { errors.add("Não foi possível carregar mecânicos: ${it.message ?: "erro desconhecido"}") }
        }
        catalogsLoaded = cachedProducts.isNotEmpty() &&
            cachedServices.isNotEmpty() &&
            cachedEmployees.isNotEmpty()
        return errors
    }

    suspend fun saveBudget(orderId: String, budget: Budget): Boolean = apiCall {
        val detail = api.getServiceOrder(orderId)
        var quoteId = budget.quoteId ?: ApiMappers.toBudget(detail).quoteId
        if (quoteId == null) {
            val created = api.createQuote(
                CreateQuoteRequest(
                    serviceOrderId = orderId,
                    status = "DRAFT",
                ),
            )
            quoteId = created.id
        }
        val currentBudget = ApiMappers.toBudget(detail)
        val toRemove = currentBudget.items.filter { existing ->
            existing.serviceOrderItemId != null &&
                budget.items.none { it.serviceOrderItemId == existing.serviceOrderItemId }
        }
        toRemove.forEach { item ->
            item.serviceOrderItemId?.let { api.removeServiceOrderItem(orderId, it) }
        }
        budget.items.forEach { item ->
            if (item.serviceOrderItemId != null) return@forEach
            val productId = if (item.type == BudgetItemType.PART) {
                cachedProducts.find { it.id == item.code }?.id ?: item.code
            } else null
            val catalogItemId = if (item.type == BudgetItemType.SERVICE) {
                cachedServices.find { it.id == item.code }?.id
            } else null
            api.addServiceOrderItem(
                orderId,
                CreateServiceOrderItemRequest(
                    description = item.name,
                    itemType = item.type.apiType,
                    quantity = item.qty,
                    unitPrice = item.unitPrice,
                    productId = productId,
                    catalogItemId = catalogItemId,
                    discount = item.discount,
                    executorId = item.executorId,
                ),
            )
        }
        api.updateQuote(quoteId, UpdateQuoteRequest(amount = budget.grandTotal))
        if (detail.status == OrderStatus.DIAGNOSIS.apiCode ||
            detail.status == OrderStatus.AWAITING_QUOTE.apiCode
        ) {
            api.updateServiceOrder(
                orderId,
                UpdateServiceOrderRequest(status = OrderStatus.AWAITING_APPROVAL.apiCode),
            )
        }
        true
    }

    suspend fun reloadBudget(orderId: String): Budget = getBudget(orderId)

    suspend fun sendBudgetToClient(orderId: String): Boolean = apiCall {
        val detail = api.getServiceOrder(orderId)
        val budget = ApiMappers.toBudget(detail)
        val quoteId = budget.quoteId ?: throw IllegalStateException("Salve o orçamento antes de enviar")
        api.updateQuote(quoteId, UpdateQuoteRequest(status = "PENDING"))
        val share = api.shareQuoteLink(quoteId)
        val phone = detail.vehicle.customer.whatsapp ?: detail.vehicle.customer.phone
        if (!phone.isNullOrBlank() && !share.whatsappMessage.isNullOrBlank()) {
            // UI layer opens WhatsApp; message available via last share
            lastShareMessage = share.whatsappMessage
        }
        api.updateServiceOrder(
            orderId,
            UpdateServiceOrderRequest(status = OrderStatus.AWAITING_APPROVAL.apiCode),
        )
        true
    }

    var lastShareMessage: String? = null

    suspend fun openWhatsAppForOrder(orderId: String): String? = apiCall {
        val link = api.createPortalLink(orderId)
        link.whatsappMessage
    }

    suspend fun searchVehicles(query: String): List<VehicleListItem> = apiCall {
        listAllVehicles(search = query.ifBlank { null })
            .map { ApiMappers.toVehicleListItem(it) }
    }

    suspend fun createCustomer(
        name: String,
        document: String? = null,
        phone: String? = null,
        whatsapp: String? = null,
    ): String = apiCall {
        api.createCustomer(
            CreateCustomerRequest(
                name = name.trim(),
                document = document?.trim()?.ifBlank { null },
                phone = phone?.trim()?.ifBlank { null },
                whatsapp = whatsapp?.trim()?.ifBlank { null },
            ),
        ).id
    }

    suspend fun createVehicle(
        customerId: String,
        plate: String,
        brand: String? = null,
        model: String? = null,
        year: Int? = null,
        color: String? = null,
    ): VehicleListItem = apiCall {
        val row = api.createVehicle(
            CreateVehicleRequest(
                customerId = customerId,
                plate = plate.trim().uppercase().replace(" ", ""),
                brand = brand?.trim()?.ifBlank { null },
                model = model?.trim()?.ifBlank { null },
                year = year,
                color = color?.trim()?.ifBlank { null },
            ),
        )
        ApiMappers.toVehicleListItem(row)
    }

    suspend fun createServiceOrder(vehicleId: String, complaint: String? = null): Order = apiCall {
        val row = api.createServiceOrder(
            CreateServiceOrderRequest(
                vehicleId = vehicleId,
                complaint = complaint?.trim()?.ifBlank { null },
            ),
        )
        refreshOrdersCache()
        ApiMappers.toOrder(row)
    }
}
